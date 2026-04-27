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
      if (error && !error.message.toLowerCase().includes('duplicate') && !error.code?.includes('23505')) {
        throw error;
      }

      await fetchMisGrupos();
      return grupo;
    },
    [user, fetchMisGrupos],
  );

  const salirDeGrupo = useCallback(
    async (grupoId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('grupo_miembros')
        .delete()
        .eq('grupo_id', grupoId)
        .eq('usuario_id', user.id);
      if (error) throw error;
      await fetchMisGrupos();
    },
    [user, fetchMisGrupos],
  );

  const eliminarGrupo = useCallback(
    async (grupoId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', grupoId)
        .eq('creador_id', user.id);
      if (error) throw error;
      await fetchMisGrupos();
    },
    [user, fetchMisGrupos],
  );

  const buscarMatchesGrupo = useCallback(
    async (grupoId: string): Promise<MatchResult[]> => {
      if (!user) return [];

      const [myProfileRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('faltantes, repetidas').eq('id', user.id).single(),
        supabase.from('grupo_miembros').select('usuario_id').eq('grupo_id', grupoId).neq('usuario_id', user.id),
      ]);

      const myProfile = myProfileRes.data;
      if (!myProfile) return [];

      const memberIds = (membersRes.data ?? []).map((r: { usuario_id: string }) => r.usuario_id);
      if (memberIds.length === 0) return [];

      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('id, alias, faltantes, repetidas')
        .in('id', memberIds);

      if (!memberProfiles) return [];

      const myFaltantesSet = new Set<number>(myProfile.faltantes);
      const myRepetidasSet = new Set<number>(myProfile.repetidas);

      return memberProfiles
        .map((p: { id: string; alias: string; faltantes: number[]; repetidas: number[] }) => {
          const ellos_tienen_yo_busco = p.repetidas.filter((n) => myFaltantesSet.has(n));
          const yo_tengo_ellos_buscan = p.faltantes.filter((n) => myRepetidasSet.has(n));
          return {
            usuario_id: p.id,
            alias: p.alias,
            distancia_km: undefined,
            ellos_tienen_yo_busco,
            yo_tengo_ellos_buscan,
            total_coincidencias: ellos_tienen_yo_busco.length + yo_tengo_ellos_buscan.length,
            es_bidireccional: ellos_tienen_yo_busco.length > 0 && yo_tengo_ellos_buscan.length > 0,
          };
        })
        .filter((m) => m.total_coincidencias > 0)
        .sort((a, b) => b.total_coincidencias - a.total_coincidencias);
    },
    [user],
  );

  return {
    misGrupos,
    loading,
    fetchMisGrupos,
    crearGrupo,
    unirseAGrupo,
    salirDeGrupo,
    eliminarGrupo,
    buscarMatchesGrupo,
  };
}
