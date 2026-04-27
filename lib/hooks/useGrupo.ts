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

      // Agregar al creador como miembro
      const { error: memErr } = await supabase.from('grupo_miembros').insert({
        grupo_id: data.id,
        usuario_id: user.id,
      });
      if (memErr) throw new Error('Grupo creado pero no se pudo agregar como miembro: ' + memErr.message);

      await fetchMisGrupos();
      return data;
    },
    [user, fetchMisGrupos],
  );

  const unirseAGrupo = useCallback(
    async (codigo: string): Promise<Grupo> => {
      if (!user) throw new Error('No autenticado');

      // El código se guarda en minúsculas (hex), normalizar siempre
      const codigoNorm = codigo.trim().toLowerCase();

      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .select('*')
        .eq('codigo', codigoNorm)
        .single();
      if (gErr || !grupo) throw new Error('Código inválido o grupo no encontrado.');

      const { error } = await supabase.from('grupo_miembros').insert({
        grupo_id: grupo.id,
        usuario_id: user.id,
      });
      // Ignorar error de duplicado (ya es miembro)
      if (error && !error.message.toLowerCase().includes('duplicate') && !error.code?.includes('23505')) {
        throw error;
      }

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
