import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useCalificacion() {
  const user = useAuthStore((s) => s.user);

  const calificar = useCallback(
    async (intercambioId: string, calificadoId: string, estrellas: number) => {
      if (!user) throw new Error('No autenticado');
      const { error } = await supabase.from('calificaciones').insert({
        intercambio_id: intercambioId,
        calificador_id: user.id,
        calificado_id: calificadoId,
        estrellas,
      });
      if (error) throw error;
    },
    [user],
  );

  const yaCalifique = useCallback(
    async (intercambioId: string): Promise<boolean> => {
      if (!user) return false;
      const { data } = await supabase
        .from('calificaciones')
        .select('id')
        .eq('intercambio_id', intercambioId)
        .eq('calificador_id', user.id)
        .maybeSingle();
      return !!data;
    },
    [user],
  );

  const promedioEstrellas = useCallback(async (usuarioId: string): Promise<number | null> => {
    const { data } = await supabase
      .from('calificaciones')
      .select('estrellas')
      .eq('calificado_id', usuarioId);
    if (!data || data.length === 0) return null;
    const sum = (data as { estrellas: number }[]).reduce(
      (acc: number, c) => acc + c.estrellas,
      0,
    );
    return Math.round((sum / data.length) * 10) / 10;
  }, []);

  return { calificar, yaCalifique, promedioEstrellas };
}
