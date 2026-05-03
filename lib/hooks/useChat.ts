import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Mensaje } from '@/types/app';

/**
 * Hook para obtener y enviar mensajes entre dos usuarios (per-person chat).
 * Obtiene todos los mensajes de la conversación entre el usuario actual y un receptor.
 */
export function useChat(recipientId: string) {
  const user = useAuthStore((s) => s.user);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    supabase
      .from('mensajes')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (mounted) {
          setMensajes(data ?? []);
          setLoading(false);
        }
      });

    const channelName = [user.id, recipientId].sort().join(':');
    channelRef.current = supabase
      .channel(`chat:${channelName}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'mensaje' }, ({ payload }) => {
        setMensajes((prev) => {
          const msg = payload as Mensaje;
          return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      channelRef.current?.unsubscribe();
    };
  }, [user, recipientId]);

  const enviar = useCallback(
    async (contenido: string, intercambioId?: string) => {
      if (!user || !contenido.trim()) return;
      const { data, error } = await supabase
        .from('mensajes')
        .insert({
          autor_id: user.id,
          sender_id: user.id,
          recipient_id: recipientId,
          contenido: contenido.trim(),
          intercambio_id: intercambioId || null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setMensajes((prev) => [...prev, data as Mensaje]);
        const channelName = [user.id, recipientId].sort().join(':');
        channelRef.current?.send({
          type: 'broadcast',
          event: 'mensaje',
          payload: data,
        });
      }
    },
    [user, recipientId],
  );

  return { mensajes, loading, enviar };
}
