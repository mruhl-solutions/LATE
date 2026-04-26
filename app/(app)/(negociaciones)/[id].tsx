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
import { ChatBubble } from '@/components/negociaciones/ChatBubble';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
import { arrayToDisplayString } from '@/lib/parsers';
import type { IntercambioConAlias } from '@/types/app';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { mensajes, loading, enviar } = useChat(id!);
  const { confirmar, cancelar, finalizar } = useIntercambios();

  const [intercambio, setIntercambio] = useState<IntercambioConAlias | null>(null);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase
      .from('intercambios')
      .select('*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setIntercambio(data as IntercambioConAlias);
        const contraparte =
          data?.iniciador_id === user?.id
            ? (data?.receptor as { alias: string } | undefined)?.alias
            : (data?.iniciador as { alias: string } | undefined)?.alias;
        navigation.setOptions({ title: contraparte ?? 'Chat' });
      });
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
    const mensajes = {
      confirmar: '¿Confirmar el trato? Los números quedarán reservados.',
      cancelar: '¿Cancelar este intercambio?',
      finalizar: '¿Marcar como realizado? Se actualizarán los inventarios de ambos.',
    };
    Alert.alert('Confirmar', mensajes[accion], [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          try {
            if (accion === 'confirmar') await confirmar(id!);
            if (accion === 'cancelar') await cancelar(id!);
            if (accion === 'finalizar') await finalizar(id!);
            const { data } = await supabase
              .from('intercambios')
              .select('*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)')
              .eq('id', id)
              .single();
            setIntercambio(data as IntercambioConAlias);
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Operación fallida.');
          }
        },
      },
    ]);
  };

  if (!intercambio) return <ActivityIndicator style={styles.loader} color="#FF6B35" />;

  const terminado = intercambio.estado === 'terminado' || intercambio.estado === 'cancelado';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Números propuestos */}
      <View style={styles.propuestaBox}>
        <View style={styles.propuestaRow}>
          <EstadoBadge estado={intercambio.estado} />
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

      {/* Mensajes */}
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

      {/* Acciones y barra de input */}
      {!terminado && (
        <>
          <View style={styles.acciones}>
            {intercambio.estado === 'en_curso' && (
              <Pressable style={styles.btnConfirmar} onPress={() => handleAccion('confirmar')}>
                <Text style={styles.btnConfirmarText}>Confirmar trato</Text>
              </Pressable>
            )}
            {intercambio.estado === 'aceptado' && (
              <Pressable style={styles.btnFinalizar} onPress={() => handleAccion('finalizar')}>
                <Text style={styles.btnFinalizarText}>¡Hecho! Finalizar</Text>
              </Pressable>
            )}
            <Pressable style={styles.btnCancelar} onPress={() => handleAccion('cancelar')}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </Pressable>
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Mensaje..."
              placeholderTextColor="#636366"
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
              ? '✅ Intercambio finalizado'
              : '❌ Intercambio cancelado'}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  loader: { flex: 1 },
  propuestaBox: {
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  propuestaRow: { flexDirection: 'row', marginBottom: 8 },
  numerosRow: { flexDirection: 'row', gap: 12 },
  numerosCol: { flex: 1 },
  numerosLabel: { fontSize: 11, color: '#636366', marginBottom: 2, textTransform: 'uppercase' },
  numeros: { fontSize: 13, color: '#ABABAB', lineHeight: 18 },
  messagesList: { padding: 12, paddingBottom: 8 },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  btnConfirmar: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnFinalizar: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnFinalizarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
    borderTopColor: '#2C2C2E',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    color: '#F5F5F5',
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
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  terminadoBanner: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  terminadoText: { color: '#ABABAB', fontSize: 15 },
});
