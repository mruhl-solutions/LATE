import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Profile, Album } from '@/types/app';

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (err) setError(err.message);
    else setProfile(data);
    setLoading(false);
  }, [user]);

  const updateInventario = useCallback(
    async (faltantes: string[], repetidas: string[]) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('profiles')
        .update({ faltantes, repetidas })
        .eq('id', user.id);
      if (err) throw err;
      setProfile((prev) => (prev ? { ...prev, faltantes, repetidas } : prev));
    },
    [user],
  );

  const fetchAlbums = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('user_albumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (err) setError(err.message);
    else setAlbums(data ?? []);
  }, [user]);

  const crearAlbum = useCallback(
    async (nombre: string): Promise<Album> => {
      if (!user) throw new Error('No autenticado');
      const { data, error: err } = await supabase
        .from('user_albumes')
        .insert({
          user_id: user.id,
          nombre,
          faltantes: [],
          repetidas: [],
          is_active: albums.length === 0,
        })
        .select()
        .single();
      if (err) throw err;
      await fetchAlbums();
      return data;
    },
    [user, albums.length, fetchAlbums],
  );

  const actualizarAlbum = useCallback(
    async (albumId: string, nombre?: string, faltantes?: string[], repetidas?: string[], total_figuritas?: number) => {
      if (!user) return;
      const updates: Record<string, unknown> = {};
      if (nombre) updates.nombre = nombre;
      if (faltantes) updates.faltantes = faltantes;
      if (repetidas) updates.repetidas = repetidas;
      if (total_figuritas) updates.total_figuritas = total_figuritas;

      const { error: err } = await supabase
        .from('user_albumes')
        .update(updates)
        .eq('id', albumId)
        .eq('user_id', user.id);
      if (err) throw err;
      await fetchAlbums();
    },
    [user, fetchAlbums],
  );

  const activarAlbum = useCallback(
    async (albumId: string) => {
      if (!user) return;
      const { error: err } = await supabase.rpc('activate_album', {
        p_user_id: user.id,
        p_album_id: albumId,
      });
      if (err) throw err;
      await fetchAlbums();
    },
    [user, fetchAlbums],
  );

  const eliminarAlbum = useCallback(
    async (albumId: string) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('user_albumes')
        .delete()
        .eq('id', albumId)
        .eq('user_id', user.id);
      if (err) throw err;
      await fetchAlbums();
    },
    [user, fetchAlbums],
  );

  const updateRadio = useCallback(
    async (radio_km: number) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('profiles')
        .update({ radio_km })
        .eq('id', user.id);
      if (err) throw err;
      setProfile((prev) => (prev ? { ...prev, radio_km } : prev));
    },
    [user],
  );

  const updateVisible = useCallback(
    async (visible_radar: boolean) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('profiles')
        .update({ visible_radar })
        .eq('id', user.id);
      if (err) throw err;
      setProfile((prev) => (prev ? { ...prev, visible_radar } : prev));
    },
    [user],
  );

  const updateTotalFiguritas = useCallback(
    async (total_figuritas: number) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('profiles')
        .update({ total_figuritas })
        .eq('id', user.id);
      if (err) throw err;
      setProfile((prev) => (prev ? { ...prev, total_figuritas } : prev));
    },
    [user],
  );

  return {
    profile,
    albums,
    loading,
    error,
    fetchProfile,
    updateInventario,
    updateRadio,
    updateVisible,
    updateTotalFiguritas,
    fetchAlbums,
    crearAlbum,
    actualizarAlbum,
    activarAlbum,
    eliminarAlbum,
  };
}
