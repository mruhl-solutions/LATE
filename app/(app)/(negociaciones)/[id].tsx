import { useState, useEffect, useRef, useCallback } from 'react';
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
import { C } from '@/constants/colors';
import type { IntercambioConAlias } from '@/types/app';

export default function ChatScreen() {
  const { id: recipientId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { confirmar, cancelar, finalizar, eliminarChat } = useIntercambios();

  const [intercambios, setIntercambios] = useState<IntercambioConAlias[]>([]);
  const [otroAlias, setOtroAlias] = useState('');
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showHistorial, setShowHistorial] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { mensajes, loading: loadingMsgs, enviar } = useChat(recipientId!);

  const handleEliminarChat = useCallback(() => {
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
              navigation.goBack();
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  }, [eliminarChat, recipientId, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleEliminarChat}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={20} color={C.danger} />
        </Pressable>
      ),
    });
  }, [navigation, handleEliminarChat]);

  const cargarIntercambios = useCallback(async () => {
    if (!recipientId || !user) return;
    const { data } = await supabase
      .from('intercambios')
      .select('*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)')
      .or(
        `and(iniciador_id.eq.${user.id},receptor_id.eq.${recipientId}),` +
        `and(iniciador_id.eq.${recipientId},receptor_id.eq.${user.id})`
      )
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as IntercambioConAlias[];
    setIntercambios(rows);

    const first = rows[0];
    if (first) {
      const otherUser =
        first.iniciador_id === user.id
          ? (first.receptor as { alias: string } | undefined)
          : (first.iniciador as { alias: string } | undefined);
      const alias = otherUser?.alias ?? 'Chat';
      setOtroAlias(alias);
      navigation.setOptions({ title: `@${alias}` });
    } else {
      const { data: pData } = await supabase
        .from('profiles')
        .select('alias')
        .eq('id', recipientId)
        .single();
      if (pData) {
        setOtroAlias(pData.alias);
        navigation.setOptions({ title: `@${pData.alias}` });
      }
    }
  }, [recipientId, user]);

  useEffect(() => {
    cargarIntercambios().finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!user || !recipientId) return;
    const channel = supabase
      .channel(`conv:${[user.id, recipientId].sort().join(':')}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'intercambios' }, () => {
        cargarIntercambios();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, recipientId, cargarIntercambios]);

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setSending(true);
    try {
      const activeFirst = intercambios.find(
        (i) => i.estado !== 'terminado' && i.estado !== 'cancelado'
      );
      await enviar(texto, activeFirst?.id);
      setTexto('');
    } finally {
      setSending(false);
    }
  };

  const handleAccion = (intercambioId: string, accion: 'confirmar' | 'cancelar' | 'finalizar') => {
    const msgs = {
      confirmar: '¿Confirmar el trato? Quedará registrado como acordado.',
      cancelar: '¿Cancelar este intercambio?',
      finalizar: '¿Marcar como realizado? Se actualizarán los inventarios.',
    };
    Alert.alert('Confirmar', msgs[accion], [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          try {
            if (accion === 'confirmar') await confirmar(intercambioId);
            else if (accion === 'cancelar') await cancelar(intercambioId);
            else await finalizar(intercambioId);
            await cargarIntercambios();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Operación fallida.');
          }
        },
      },
    ]);
  };

  const perspectiva = (inter: IntercambioConAlias) => {
    const soyIniciador = inter.iniciador_id === user?.id;
    return {
      quiero: soyIniciador ? inter.numeros_pedidos : inter.numeros_ofrecidos,
      doy:    soyIniciador ? inter.numeros_ofrecidos : inter.numeros_pedidos,
    };
  };

  if (loadingData) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const activeIntercambios = intercambios.filter(
    (i) => i.estado !== 'terminado' && i.estado !== 'cancelado'
  );
  const pastIntercambios = intercambios.filter(
    (i) => i.estado === 'terminado' || i.estado === 'cancelado'
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* ── Intercambios activos ── */}
      {activeIntercambios.length > 0 && (
        <View style={styles.panelWrap}>
          {activeIntercambios.map((inter) => {
            const { quiero, doy } = perspectiva(inter);
            return (
              <View key={inter.id} style={styles.panel}>
                <View style={styles.panelTop}>
                  <EstadoBadge estado={inter.estado} />
                  <Text style={styles.panelDate}>
                    {new Date(inter.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>

                <View style={styles.intercambioGrid}>
                  <View style={[styles.intercambioCol, styles.colQuiero]}>
                    <View style={styles.colHeader}>
                      <Ionicons name="arrow-down-circle" size={13} color={C.info} />
                      <Text style={[styles.colLabel, { color: C.info }]}>Quiero</Text>
                      <View style={[styles.colBadge, { backgroundColor: `${C.info}22` }]}>
                        <Text style={[styles.colBadgeText, { color: C.info }]}>{quiero.length}</Text>
                      </View>
                    </View>
                    <Text style={styles.colNums} numberOfLines={2}>
                      {quiero.length > 0 ? arrayToDisplayString(quiero) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.intercambioCol, styles.colDoy]}>
                    <View style={styles.colHeader}>
                      <Ionicons name="arrow-up-circle" size={13} color={C.primary} />
                      <Text style={[styles.colLabel, { color: C.primary }]}>Doy</Text>
                      <View style={[styles.colBadge, { backgroundColor: `${C.primary}22` }]}>
                        <Text style={[styles.colBadgeText, { color: C.primary }]}>{doy.length}</Text>
                      </View>
                    </View>
                    <Text style={styles.colNums} numberOfLines={2}>
                      {doy.length > 0 ? arrayToDisplayString(doy) : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.acciones}>
                  {inter.estado === 'iniciado' && inter.receptor_id === user?.id && (
                    <Pressable
                      style={styles.btnAceptar}
                      onPress={() => handleAccion(inter.id, 'confirmar')}
                    >
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={styles.btnText}>Aceptar</Text>
                    </Pressable>
                  )}
                  {inter.estado === 'en_curso' && (
                    <Pressable
                      style={styles.btnAceptar}
                      onPress={() => handleAccion(inter.id, 'confirmar')}
                    >
                      <Ionicons name="handshake-outline" size={15} color="#fff" />
                      <Text style={styles.btnText}>Confirmar trato</Text>
                    </Pressable>
                  )}
                  {inter.estado === 'aceptado' && (
                    <Pressable
                      style={styles.btnFinalizar}
                      onPress={() => handleAccion(inter.id, 'finalizar')}
                    >
                      <Ionicons name="checkmark-done" size={15} color="#fff" />
                      <Text style={styles.btnText}>¡Hecho! Finalizar</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.btnCancelar}
                    onPress={() => handleAccion(inter.id, 'cancelar')}
                  >
                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Sin intercambios ── */}
      {intercambios.length === 0 && (
        <View style={styles.sinIntercambioBar}>
          <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
          <Text style={styles.sinIntercambioText}>
            Chat con <Text style={{ color: C.primary }}>@{otroAlias}</Text>
          </Text>
        </View>
      )}

      {/* ── Historial de intercambios pasados ── */}
      {pastIntercambios.length > 0 && (
        <View style={styles.historialWrap}>
          <Pressable
            style={styles.historialToggle}
            onPress={() => setShowHistorial((v) => !v)}
          >
            <Ionicons name="time-outline" size={13} color={C.textMuted} />
            <Text style={styles.historialLabel}>
              Historial · {pastIntercambios.length} intercambio
              {pastIntercambios.length !== 1 ? 's' : ''}
            </Text>
            <Ionicons
              name={showHistorial ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={C.textMuted}
            />
          </Pressable>

          {showHistorial &&
            pastIntercambios.map((inter) => {
              const { quiero, doy } = perspectiva(inter);
              return (
                <View key={inter.id} style={styles.historialCard}>
                  <View style={styles.historialTop}>
                    <EstadoBadge estado={inter.estado} compact />
                    <Text style={styles.historialDate}>
                      {new Date(inter.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historialRow}>
                    <View style={styles.historialCol}>
                      <Text style={[styles.historialColLabel, { color: C.info }]}>Quiero</Text>
                      <Text style={styles.historialColNums} numberOfLines={1}>
                        {quiero.length > 0
                          ? `${quiero.slice(0, 4).join(', ')}${quiero.length > 4 ? ` +${quiero.length - 4}` : ''}`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.historialSep} />
                    <View style={styles.historialCol}>
                      <Text style={[styles.historialColLabel, { color: C.primary }]}>Doy</Text>
                      <Text style={styles.historialColNums} numberOfLines={1}>
                        {doy.length > 0
                          ? `${doy.slice(0, 4).join(', ')}${doy.length > 4 ? ` +${doy.length - 4}` : ''}`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* ── Lista de mensajes ── */}
      <FlatList
        ref={flatListRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <ChatBubble mensaje={item} esMio={item.sender_id === user?.id} />
        )}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !loadingMsgs ? (
            <View style={styles.emptyMsgs}>
              <Text style={styles.emptyMsgsText}>
                Empezá la conversación con @{otroAlias}
              </Text>
            </View>
          ) : null
        }
      />

      {/* ── Input de mensaje ── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={`Mensaje a @${otroAlias}...`}
          placeholderTextColor={C.textMuted}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={handleEnviar}
          returnKeyType="send"
          multiline
        />
        <Pressable
          style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnOff]}
          onPress={handleEnviar}
          disabled={!texto.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loaderWrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  // ── Panel de intercambio activo
  panelWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  panel: { padding: 12, gap: 8 },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelDate: { fontSize: 11, color: C.textMuted },

  intercambioGrid: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  intercambioCol: { flex: 1, padding: 8, gap: 4 },
  colQuiero: { borderRightWidth: 1, borderRightColor: C.border },
  colDoy: {},
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colLabel: { flex: 1, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  colBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  colBadgeText: { fontSize: 10, fontWeight: '800' },
  colNums: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },

  acciones: { flexDirection: 'row', gap: 6 },
  btnAceptar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingVertical: 8,
  },
  btnFinalizar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnCancelar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarText: { color: C.danger, fontWeight: '600', fontSize: 12 },

  // ── Sin intercambios
  sinIntercambioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sinIntercambioText: { fontSize: 13, color: C.textMuted },

  // ── Historial colapsable
  historialWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  historialToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  historialLabel: { flex: 1, fontSize: 12, color: C.textMuted, fontWeight: '600' },
  historialCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    gap: 6,
  },
  historialTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historialDate: { fontSize: 11, color: C.textMuted },
  historialRow: { flexDirection: 'row', alignItems: 'center' },
  historialCol: { flex: 1, gap: 2 },
  historialSep: { width: 1, height: 26, backgroundColor: C.border, marginHorizontal: 10 },
  historialColLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  historialColNums: { fontSize: 11, color: C.textSecondary },

  // ── Mensajes
  messagesList: { flexGrow: 1, paddingVertical: 8 },
  emptyMsgs: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyMsgsText: { fontSize: 13, color: C.textMuted },

  // ── Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  textInput: {
    flex: 1,
    backgroundColor: C.bg,
    color: C.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.35 },
});
