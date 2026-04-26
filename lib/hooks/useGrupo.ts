import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Grupo, MatchResult } from '@/types/app';

export function useGrupo() {
  const user = useAuthStore((s) => s.user);
  const [misGrupos, setMisGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMisGrupos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('grupo_miembros')
      .select('grupos(*)')
      .eq('usuario_id', user.id);

    const grupos = (data ?? [])
      .map((row: { grupos: unknown }) => row.grupos)
      .filter(Boolean) as Grupo[];
    setMisGrupos(grupos);
    setLoading(false);
  }, [user]);

  const crearGrupo = useCallback(
    async (nombre: string): Promise<Grupo> => {
      if (!user) throw new Error('No autenticado');
      const { data, error } = await supabase
        .from('grupos')
        .insert({ nombre, creador_id: user.id })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('grupo_miembros').insert({
        grupo_id: data.id,
        usuario_id: user.id,
      });

      await fetchMisGrupos();
      return data;
    },
    [user, fetchMisGrupos],
  );

  const unirseAGrupo = useCallback(
    async (codigo: string): Promise<Grupo> => {
      if (!user) throw new Error('No autenticado');
      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .select('*')
        .eq('codigo', codigo)
        .single();
      if (gErr) throw new Error('Grupo no encontrado');

      const { error } = await supabase.from('grupo_miembros').insert({
        grupo_id: grupo.id,
        usuario_id: user.id,
      });
      if (error && !error.message.includes('duplicate')) throw error;

      await fetchMisGrupos();
      return grupo;
    },
    [user, fetchMisGrupos],
  );

  const buscarMatchesGrupo = useCallback(
    async (grupoId: string): Promise<MatchResult[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('buscar_matches_grupo', {
        p_grupo_id: grupoId,
        p_usuario_id: user.id,
      });
      if (error) throw error;
      return (data as MatchResult[]) ?? [];
    },
    [user],
  );

  return { misGrupos, loading, fetchMisGrupos, crearGrupo, unirseAGrupo, buscarMatchesGrupo };
}
