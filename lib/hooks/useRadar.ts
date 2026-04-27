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
  const [inventarioVacio, setInventarioVacio] = useState(false);

  const buscarMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setInventarioVacio(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesita permiso de ubicación para el radar.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Actualizar ubicación directamente sin depender del schema cache del RPC
      const { error: locErr } = await supabase
        .from('profiles')
        .update({
          ubicacion: `SRID=4326;POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        })
        .eq('id', user.id);
      if (locErr) console.warn('ubicacion update:', locErr.message);

      // Verificar si el inventario propio está vacío antes de buscar
      const { data: perfil } = await supabase
        .from('profiles')
        .select('faltantes, repetidas')
        .eq('id', user.id)
        .single();

      if (
        perfil &&
        perfil.faltantes.length === 0 &&
        perfil.repetidas.length === 0
      ) {
        setInventarioVacio(true);
        setMatches([]);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc('buscar_matches_radar', {
        p_usuario_id: user.id,
      });

      if (rpcErr) throw rpcErr;
      setMatches((data as MatchResult[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al buscar matches.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { matches, loading, error, inventarioVacio, buscarMatches };
}
