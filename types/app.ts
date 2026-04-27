import type { Database, EstadoIntercambio } from './database';

export type { EstadoIntercambio };

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Grupo = Database['public']['Tables']['grupos']['Row'];
export type Intercambio = Database['public']['Tables']['intercambios']['Row'];
export type Mensaje = Database['public']['Tables']['mensajes']['Row'];

export interface MatchResult {
  usuario_id: string;
  alias: string;
  distancia_km?: number;
  ellos_tienen_yo_busco: number[];
  yo_tengo_ellos_buscan: number[];
  total_coincidencias: number;
  es_bidireccional: boolean;
}

export interface IntercambioConAlias extends Intercambio {
  iniciador?: { alias: string };
  receptor?: { alias: string };
}

export interface Calificacion {
  id: string;
  intercambio_id: string;
  calificador_id: string;
  calificado_id: string;
  estrellas: number;
  created_at: string;
}
