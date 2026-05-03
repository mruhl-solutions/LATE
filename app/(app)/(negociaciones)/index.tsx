import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIntercambios, type ConversacionInfo } from '@/lib/hooks/useIntercambios';
import { EmptyState } from '@/components/ui/EmptyState';
import { C, Colors } from '@/constants/colors';
import type { EstadoIntercambio } from '@/types/app';
import { useAuthStore } from '@/store/authStore';

type Tab = 'activos' | 'completados' | 'cancelados';

// Determina el estado más relevante de una conversación
function estadoPrioritario(estados: EstadoIntercambio[]): EstadoIntercambio {
  if (estados.includes('aceptado')) return 'aceptado';
  if (estados.includes('en_curso')) return 'en_curso';
  if (estados.includes('iniciado')) return 'iniciado';
  if (estados.includes('terminado')) return 'terminado';
  return 'cancelado';
}

const ESTADO_LABEL: Record<EstadoIntercambio, string> = {
  iniciado:  'Propuesta pendiente',
  en_curso:  'En negociación',
  aceptado:  'Trato acordado',
  terminado: 'Finalizado',
  cancelado: 'Cancelado',
};

const ConversacionCard = ({
  conversacion,
}: {
  conversacion: ConversacionInfo;
}) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const estados = conversacion.intercambios.map((i) => i.estado);
  const estado = estadoPrioritario(estados);
  const color = Colors.estado[estado];

  const fecha = new Date(conversacion.ultimo_mensaje_fecha);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  let fechaTexto = fecha.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
  if (fecha.toDateString() === hoy.toDateString())
    fechaTexto = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  else if (fecha.toDateString() === ayer.toDateString()) fechaTexto = 'Ayer';

  // Vista previa: tomar el intercambio más reciente y mostrarlo desde perspectiva del usuario
  const latest = conversacion.intercambios[0];
  const soyIniciador = latest?.iniciador_id === user?.id;
  const quiero = soyIniciador ? latest?.numeros_pedidos : latest?.numeros_ofrecidos;
  const doy    = soyIniciador ? latest?.numeros_ofrecidos : latest?.numeros_pedidos;

  return (
    <Pressable
      style={[styles.card, { borderLeftColor: color }]}
      onPress={() => router.push(`/(negociaciones)/${conversacion.usuario_id}`)}
      android_ripple={{ color: `${C.primary}22` }}
    >
      {/* Fila superior: alias + fecha */}
      <View style={styles.cardTop}>
        <Text style={styles.alias}>@{conversacion.alias}</Text>
        <Text style={styles.fecha}>{fechaTexto}</Text>
      </View>

      {/* Estado + contador */}
      <View style={styles.estadoRow}>
        <View style={[styles.estadoDot, { backgroundColor: color }]} />
        <Text style={[styles.estadoText, { color }]}>{ESTADO_LABEL[estado]}</Text>
        {conversacion.intercambios.length > 1 && (
          <View style={styles.countBubble}>
            <Text style={styles.countBubbleText}>{conversacion.intercambios.length}</Text>
          </View>
        )}
      </View>

      {/* Preview del intercambio más reciente */}
      {latest && (quiero?.length > 0 || doy?.length > 0) && (
        <View style={styles.preview}>
          {quiero?.length > 0 && (
            <View style={styles.previewRow}>
              <Ionicons name="arrow-down-circle" size={11} color={C.info} />
              <Text style={styles.previewLabel}>Quiero</Text>
              <Text style={styles.previewNums} numberOfLines={1}>
                {quiero.slice(0, 4).join(', ')}{quiero.length > 4 ? ` +${quiero.length - 4}` : ''}
              </Text>
            </View>
          )}
          {doy?.length > 0 && (
            <View style={styles.previewRow}>
              <Ionicons name="arrow-up-circle" size={11} color={C.primary} />
              <Text style={styles.previewLabel}>Doy</Text>
              <Text style={styles.previewNums} numberOfLines={1}>
                {doy.slice(0, 4).join(', ')}{doy.length > 4 ? ` +${doy.length - 4}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export default function NegociacionesScreen() {
  const { conversaciones, loading, fetchAll } = useIntercambios();
  const [tab, setTab] = useState<Tab>('activos');

  useEffect(() => { fetchAll(); }, []);

  const currentData = useMemo(() => {
    switch (tab) {
      case 'activos':
        return conversaciones.filter((c) =>
          c.intercambios.some((i) => i.estado !== 'terminado' && i.estado !== 'cancelado')
        );
      case 'completados':
        return conversaciones.filter((c) =>
          c.intercambios.some((i) => i.estado === 'terminado') &&
          !c.intercambios.some((i) => i.estado !== 'terminado' && i.estado !== 'cancelado')
        );
      default:
        return conversaciones.filter((c) =>
          c.intercambios.every((i) => i.estado === 'cancelado')
        );
    }
  }, [conversaciones, tab]);

  const renderConversacion = useCallback(
    ({ item }: { item: ConversacionInfo }) => <ConversacionCard conversacion={item} />,
    [],
  );

  const activeCount = conversaciones.filter((c) =>
    c.intercambios.some((i) => i.estado !== 'terminado' && i.estado !== 'cancelado')
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Chats</Text>

      <View style={styles.tabs}>
        {(['activos', 'completados', 'cancelados'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'activos'
                ? `Activos${activeCount > 0 ? ` (${activeCount})` : ''}`
                : t === 'completados'
                ? 'Completados'
                : 'Cancelados'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={currentData}
        renderItem={renderConversacion}
        keyExtractor={(item) => item.usuario_id}
        estimatedItemSize={110}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={
                tab === 'activos' ? 'chatbubbles-outline' :
                tab === 'completados' ? 'checkmark-circle-outline' :
                'close-circle-outline'
              }
              title={
                tab === 'activos' ? 'Sin negociaciones activas' :
                tab === 'completados' ? 'Sin intercambios completados' :
                'Sin cancelados'
              }
              subtitle={
                tab === 'activos'
                  ? 'Cuando te propongan o acepten un intercambio, aparecerá aquí.'
                  : tab === 'completados'
                  ? 'Los intercambios exitosos aparecerán acá.'
                  : 'Los intercambios cancelados aparecerán acá.'
              }
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alias: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  fecha: { fontSize: 11, color: C.textMuted },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estadoDot: { width: 7, height: 7, borderRadius: 4 },
  estadoText: { fontSize: 12, fontWeight: '600' },
  countBubble: {
    marginLeft: 4,
    backgroundColor: C.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBubbleText: { fontSize: 10, color: C.textSecondary, fontWeight: '700' },

  // Preview del intercambio
  preview: {
    gap: 3,
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, width: 34 },
  previewNums: { flex: 1, fontSize: 11, color: C.textSecondary },
});
