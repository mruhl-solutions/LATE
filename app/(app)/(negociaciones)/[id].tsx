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
  ScrollView,
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
  const [selectedIntercambio, setSelectedIntercambio] = useState<IntercambioConAlias | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const { mensajes, loading: loadingMsgs, enviar } = useChat(recipientId!);

  const cargarIntercambios = useCallback(async () => {
    if (!recipientId || !user) return;
    const { data } = await supabase
      .from('intercambios')
      .select('*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)')
      .or(
        `and(iniciador_id.eq.${user.id},receptor_id.eq.${recipientId}),` +
        `and(iniciador_id.eq.${recipientId},receptor_id.eq.${user.id})`
      )
      .order('updated_at', { ascending: false });

    const rows = (data ?? []) as IntercambioConAlias[];
    setIntercambios(rows);
    if (rows.length > 0 && !selectedIntercambio) {
      setSelectedIntercambio(rows[0]);
    } else if (rows.length > 0 && selectedIntercambio) {
      // Refrescar el intercambio seleccionado con datos actualizados
      const updated = rows.find((r) => r.id === selectedIntercambio.id);
      if (updated) setSelectedIntercambio(updated);
    }

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
      // No hay intercambios aún: obtener el alias del destinatario
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

  // Realtime: escuchar cambios de estado en intercambios de esta conversación
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
      await enviar(texto, selectedIntercambio?.id);
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
            try { await eliminarChat(recipientId!); }
            catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.'); }
          },
        },
      ],
    );
  };

  // ── Helpers de perspectiva ──────────────────────────────────
  const perspectiva = (inter: IntercambioConAlias) => {
    const soyIniciador = inter.iniciador_id === user?.id;
    return {
      // Lo que YO quiero recibir
      quiero: soyIniciador ? inter.numeros_pedidos : inter.numeros_ofrecidos,
      // Lo que YO doy a cambio
      doy: soyIniciador ? inter.numeros_ofrecidos : inter.numeros_pedidos,
    };
  };

  if (loadingData) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const terminado =
    selectedIntercambio?.estado === 'terminado' ||
    selectedIntercambio?.estado === 'cancelado';

  return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* ── Panel de intercambio(s) ── */}
        {intercambios.length > 0 && selectedIntercambio ? (
          <View style={styles.panelWrap}>
            {/* Selector si hay más de un intercambio */}
            {intercambios.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorScroll}
              >
                {intercambios.map((inter, idx) => {
                  const active = inter.id === selectedIntercambio.id;
                  return (
                    <Pressable
                      key={inter.id}
                      style={[styles.selectorChip, active && styles.selectorChipActive]}
                      onPress={() => setSelectedIntercambio(inter)}
                    >
                      <EstadoBadge estado={inter.estado} compact />
                      <Text style={[styles.selectorChipText, active && styles.selectorChipTextActive]}>
                        Intercambio {idx + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Detalle del intercambio seleccionado */}
            <View style={styles.panel}>
              <View style={styles.panelTop}>
                <EstadoBadge estado={selectedIntercambio.estado} />
              </View>

              {(() => {
                const { quiero, doy } = perspectiva(selectedIntercambio);
                return (
                  <View style={styles.intercambioGrid}>
                    <View style={[styles.intercambioCol, styles.colQuiero]}>
                      <View style={styles.colHeader}>
                        <Ionicons name="arrow-down-circle" size={14} color={C.info} />
                        <Text style={[styles.colLabel, { color: C.info }]}>Quiero</Text>
                        <View style={[styles.colBadge, { backgroundColor: `${C.info}22` }]}>
                          <Text style={[styles.colBadgeText, { color: C.info }]}>{quiero.length}</Text>
                        </View>
                      </View>
                      <Text style={styles.colNums} numberOfLines={3}>
                        {quiero.length > 0 ? arrayToDisplayString(quiero) : '—'}
                      </Text>
                    </View>

                    <View style={styles.colDivider} />

                    <View style={[styles.intercambioCol, styles.colDoy]}>
                      <View style={styles.colHeader}>
                        <Ionicons name="arrow-up-circle" size={14} color={C.primary} />
                        <Text style={[styles.colLabel, { color: C.primary }]}>Doy</Text>
                        <View style={[styles.colBadge, { backgroundColor: `${C.primary}22` }]}>
                          <Text style={[styles.colBadgeText, { color: C.primary }]}>{doy.length}</Text>
                        </View>
                      </View>
                      <Text style={styles.colNums} numberOfLines={3}>
                        {doy.length > 0 ? arrayToDisplayString(doy) : '—'}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        ) : (
          /* Sin intercambios todavía — solo chat */
          <View style={styles.sinIntercambioBar}>
            <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
            <Text style={styles.sinIntercambioText}>
              Chat directo con <Text style={{ color: C.primary }}>@{otroAlias}</Text>
            </Text>
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

        {/* ── Acciones del intercambio ── */}
        {selectedIntercambio && !terminado && (
          <View style={styles.acciones}>
            {selectedIntercambio.estado === 'iniciado' &&
              selectedIntercambio.receptor_id === user?.id && (
                <Pressable
                  style={styles.btnAceptar}
                  onPress={() => handleAccion(selectedIntercambio.id, 'confirmar')}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.btnText}>Aceptar</Text>
                </Pressable>
              )}
            {selectedIntercambio.estado === 'en_curso' && (
              <Pressable
                style={styles.btnAceptar}
                onPress={() => handleAccion(selectedIntercambio.id, 'confirmar')}
              >
                <Ionicons name="handshake-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Confirmar trato</Text>
              </Pressable>
            )}
            {selectedIntercambio.estado === 'aceptado' && (
              <Pressable
                style={styles.btnFinalizar}
                onPress={() => handleAccion(selectedIntercambio.id, 'finalizar')}
              >
                <Ionicons name="checkmark-done" size={16} color="#fff" />
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
        )}

        {/* Banner estado final */}
        {selectedIntercambio && terminado && (
          <View style={styles.terminadoBanner}>
            <Text style={styles.terminadoText}>
              {selectedIntercambio.estado === 'terminado'
                ? '✅ Intercambio completado'
                : '❌ Intercambio cancelado'}
            </Text>
            <Pressable onPress={handleEliminarChat} style={styles.deleteChatBtn}>
              <Ionicons name="trash-outline" size={13} color={C.danger} />
              <Text style={styles.deleteChatText}>Eliminar chat</Text>
            </Pressable>
          </View>
        )}

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
  loaderWrap: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Panel de intercambio
  panelWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  selectorScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectorChipActive: { borderColor: C.primary, backgroundColor: `${C.primary}18` },
  selectorChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  selectorChipTextActive: { color: C.primary },

  panel: { padding: 12, gap: 10 },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intercambioGrid: {
    flexDirection: 'row',
    gap: 0,
    backgroundColor: C.bg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  intercambioCol: { flex: 1, padding: 10, gap: 6 },
  colQuiero: { borderRightWidth: 1, borderRightColor: C.border },
  colDoy: {},
  colDivider: { width: 0 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  colLabel: { flex: 1, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  colBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  colBadgeText: { fontSize: 11, fontWeight: '800' },
  colNums: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },

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

  // Mensajes
  messagesList: { flexGrow: 1, paddingVertical: 8 },
  emptyMsgs: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyMsgsText: { fontSize: 13, color: C.textMuted },

  // Acciones
  acciones: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  btnAceptar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnFinalizar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnCancelar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarText: { color: C.danger, fontWeight: '600', fontSize: 13 },

  // Banner terminado
  terminadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  terminadoText: { fontSize: 13, color: C.textMuted },
  deleteChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.dangerAlpha,
  },
  deleteChatText: { fontSize: 12, color: C.danger, fontWeight: '600' },

  // Input
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
