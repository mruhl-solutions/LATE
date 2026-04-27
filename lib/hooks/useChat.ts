import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Mensaje } from '@/types/app';

export function useChat(intercambioId: string) {
  const user = useAuthStore((s) => s.user);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase
      .from('mensajes')
      .select('*')
      .eq('intercambio_id', intercambioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (mounted) {
          setMensajes(data ?? []);
          setLoading(false);
        }
      });

    channelRef.current = supabase
      .channel(`chat:${intercambioId}`, { config: { broadcast: { self: false } } })
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
  }, [intercambioId]);

  const enviar = useCallback(
    async (contenido: string) => {
      if (!user || !contenido.trim()) return;
      const { data, error } = await supabase
        .from('mensajes')
        .insert({
          intercambio_id: intercambioId,
          autor_id: user.id,
          contenido: contenido.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setMensajes((prev) => [...prev, data as Mensaje]);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'mensaje',
          payload: data,
        });
      }
    },
    [user, intercambioId],
  );

  return { mensajes, loading, enviar };
}
