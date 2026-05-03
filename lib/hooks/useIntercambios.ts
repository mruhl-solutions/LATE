import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { IntercambioConAlias } from '@/types/app';

export interface ConversacionInfo {
  usuario_id: string;
  alias: string;
  ultimo_mensaje_fecha: string;
  intercambios: IntercambioConAlias[];
}

export function useIntercambios() {
  const user = useAuthStore((s) => s.user);
  const [conversaciones, setConversaciones] = useState<ConversacionInfo[]>([]);
  const [negociaciones, setNegociaciones] = useState<IntercambioConAlias[]>([]);
  const [completados, setCompletados] = useState<IntercambioConAlias[]>([]);
  const [historial, setHistorial] = useState<IntercambioConAlias[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Obtiene todos los intercambios y agrupa por persona.
   * Las conversaciones incluyen todos los intercambios con esa persona.
   */
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Obtener todos los intercambios activos/en negociación
      const { data: activos } = await supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .in('estado', ['iniciado', 'en_curso', 'aceptado'])
        .order('updated_at', { ascending: false });

      // Obtener intercambios completados
      const { data: comp } = await supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .eq('estado', 'terminado')
        .order('updated_at', { ascending: false })
        .limit(50);

      // Obtener intercambios cancelados
      const { data: cancelados } = await supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .eq('estado', 'cancelado')
        .order('updated_at', { ascending: false })
        .limit(50);

      const allActivos = (activos as IntercambioConAlias[]) ?? [];
      const allComp = (comp as IntercambioConAlias[]) ?? [];
      const allCancelados = (cancelados as IntercambioConAlias[]) ?? [];

      // Separar en negociaciones, completados e historial
      setNegociaciones(allActivos);
      setCompletados(allComp);
      setHistorial(allCancelados);

      // Agrupar por persona para conversaciones
      const conversacionesMap = new Map<string, ConversacionInfo>();

      for (const intercambio of allActivos) {
        const otherUserId =
          intercambio.iniciador_id === user.id
            ? intercambio.receptor_id
            : intercambio.iniciador_id;

        const otherUser =
          intercambio.iniciador_id === user.id
            ? (intercambio.receptor as { alias: string } | undefined)
            : (intercambio.iniciador as { alias: string } | undefined);

        const alias = otherUser?.alias ?? 'Unknown';

        if (!conversacionesMap.has(otherUserId)) {
          conversacionesMap.set(otherUserId, {
            usuario_id: otherUserId,
            alias,
            ultimo_mensaje_fecha: intercambio.updated_at,
            intercambios: [],
          });
        }

        const conv = conversacionesMap.get(otherUserId)!;
        conv.intercambios.push(intercambio);

        if (intercambio.updated_at > conv.ultimo_mensaje_fecha) {
          conv.ultimo_mensaje_fecha = intercambio.updated_at;
        }
      }

      const conversacionesArray = Array.from(conversacionesMap.values())
        .sort((a, b) =>
          new Date(b.ultimo_mensaje_fecha).getTime() -
          new Date(a.ultimo_mensaje_fecha).getTime()
        );

      setConversaciones(conversacionesArray);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const crearIntercambio = useCallback(
    async (
      receptor_id: string,
      numeros_pedidos: string[],
      numeros_ofrecidos: string[],
      grupo_id?: string,
    ) => {
      if (!user) return;
      const { error } = await supabase.from('intercambios').insert({
        iniciador_id: user.id,
        receptor_id,
        numeros_pedidos,
        numeros_ofrecidos,
        grupo_id: grupo_id ?? null,
      });
      if (error) throw error;
    },
    [user],
  );

  const aceptar = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('intercambios')
        .update({ estado: 'en_curso' })
        .eq('id', id);
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll],
  );

  const confirmar = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('intercambios')
        .update({ estado: 'aceptado' })
        .eq('id', id);
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll],
  );

  const cancelar = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('intercambios')
        .update({ estado: 'cancelado' })
        .eq('id', id);
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll],
  );

  const finalizar = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('finalizar_intercambio', {
        p_intercambio_id: id,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll],
  );

  const eliminarChat = useCallback(
    async (userId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
        );
      if (error) throw error;
    },
    [user],
  );

  return {
    conversaciones,
    negociaciones,
    completados,
    historial,
    loading,
    fetchAll,
    crearIntercambio,
    aceptar,
    confirmar,
    cancelar,
    finalizar,
    eliminarChat,
  };
}
