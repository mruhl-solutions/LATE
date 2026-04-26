import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { MatchResult } from '@/types/app';

export function useRadar() {
  const user = useAuthStore((s) => s.user);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesita permiso de ubicación para el radar.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await supabase.rpc('actualizar_ubicacion', {
        p_usuario_id: user.id,
        p_lat: loc.coords.latitude,
        p_lng: loc.coords.longitude,
      });

      const { data, error: rpcErr } = await supabase.rpc('buscar_matches_radar', {
        p_usuario_id: user.id,
      });

      if (rpcErr) throw rpcErr;
      setMatches((data as MatchResult[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { matches, loading, error, buscarMatches };
}
