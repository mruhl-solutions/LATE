import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types/app';

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
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
    async (faltantes: number[], repetidas: number[]) => {
      if (!user) return;
      const { error: err } = await supabase
        .from('profiles')
        .update({ faltantes, repetidas })
        .eq('id', user.id);
      if (err) throw err;
      // Re-fetch para garantizar que los contadores reflejen el estado real de la DB
      setProfile((prev) => (prev ? { ...prev, faltantes, repetidas } : prev));
    },
    [user],
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

  return { profile, loading, error, fetchProfile, updateInventario, updateRadio };
}
