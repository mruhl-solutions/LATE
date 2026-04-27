import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { IntercambioConAlias } from '@/types/app';

export function useIntercambios() {
  const user = useAuthStore((s) => s.user);
  const [recibidas, setRecibidas] = useState<IntercambioConAlias[]>([]);
  const [enviadas, setEnviadas] = useState<IntercambioConAlias[]>([]);
  const [negociaciones, setNegociaciones] = useState<IntercambioConAlias[]>([]);
  const [historial, setHistorial] = useState<IntercambioConAlias[]>([]);
  const [completados, setCompletados] = useState<IntercambioConAlias[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [recv, sent, neg, hist, comp] = await Promise.all([
      supabase
        .from('intercambios')
        .select('*, iniciador:profiles!iniciador_id(alias)')
        .eq('receptor_id', user.id)
        .eq('estado', 'iniciado')
        .order('updated_at', { ascending: false }),

      supabase
        .from('intercambios')
        .select('*, receptor:profiles!receptor_id(alias)')
        .eq('iniciador_id', user.id)
        .eq('estado', 'iniciado')
        .order('updated_at', { ascending: false }),

      supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .in('estado', ['en_curso', 'aceptado'])
        .order('updated_at', { ascending: false }),

      supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .eq('estado', 'cancelado')
        .order('updated_at', { ascending: false })
        .limit(50),

      supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`iniciador_id.eq.${user.id},receptor_id.eq.${user.id}`)
        .eq('estado', 'terminado')
        .order('updated_at', { ascending: false })
        .limit(50),
    ]);

    setRecibidas((recv.data as IntercambioConAlias[]) ?? []);
    setEnviadas((sent.data as IntercambioConAlias[]) ?? []);
    setNegociaciones((neg.data as IntercambioConAlias[]) ?? []);
    setHistorial((hist.data as IntercambioConAlias[]) ?? []);
    setCompletados((comp.data as IntercambioConAlias[]) ?? []);
    setLoading(false);
  }, [user]);

  const crearIntercambio = useCallback(
    async (
      receptor_id: string,
      numeros_pedidos: number[],
      numeros_ofrecidos: number[],
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
    async (intercambioId: string) => {
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .eq('intercambio_id', intercambioId);
      if (error) throw error;
    },
    [],
  );

  return {
    recibidas,
    enviadas,
    negociaciones,
    historial,
    completados,
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
