import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Mensaje } from '@/types/app';

export function useChat(intercambioId: string, otroUsuarioId?: string) {
  const user = useAuthStore((s) => s.user);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMensajes = useCallback(async () => {
    setLoading(true);

    if (otroUsuarioId && user) {
      // Cargar todos los mensajes entre los dos usuarios (cross-exchange)
      const { data: intercambios } = await supabase
        .from('intercambios')
        .select('id')
        .or(
          `and(iniciador_id.eq.${user.id},receptor_id.eq.${otroUsuarioId}),and(iniciador_id.eq.${otroUsuarioId},receptor_id.eq.${user.id})`,
        );

      const ids = (intercambios as Array<{ id: string }>)?.map((i) => i.id) ?? [intercambioId];

      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .in('intercambio_id', ids)
        .order('created_at', { ascending: true });

      setMensajes(data ?? []);
    } else {
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .eq('intercambio_id', intercambioId)
        .order('created_at', { ascending: true });

      setMensajes(data ?? []);
    }

    setLoading(false);
  }, [intercambioId, otroUsuarioId, user]);

  useEffect(() => {
    fetchMensajes();

    // Suscripción en tiempo real solo al intercambio activo
    channelRef.current = supabase
      .channel(`chat:${intercambioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `intercambio_id=eq.${intercambioId}`,
        },
        (payload) => setMensajes((prev) => [...prev, payload.new as Mensaje]),
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [intercambioId, fetchMensajes]);

  const enviar = useCallback(
    async (contenido: string) => {
      if (!user || !contenido.trim()) return;
      const { error } = await supabase.from('mensajes').insert({
        intercambio_id: intercambioId,
        autor_id: user.id,
        contenido: contenido.trim(),
      });
      if (error) throw error;
    },
    [user, intercambioId],
  );

  return { mensajes, loading, enviar };
}
