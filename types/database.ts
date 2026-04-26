export type EstadoIntercambio =
  | 'iniciado'
  | 'en_curso'
  | 'aceptado'
  | 'terminado'
  | 'cancelado';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          alias: string;
          ubicacion: unknown | null;
          radio_km: number;
          faltantes: number[];
          repetidas: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          alias: string;
          ubicacion?: unknown | null;
          radio_km?: number;
          faltantes?: number[];
          repetidas?: number[];
        };
        Update: {
          alias?: string;
          ubicacion?: unknown | null;
          radio_km?: number;
          faltantes?: number[];
          repetidas?: number[];
        };
      };
      grupos: {
        Row: {
          id: string;
          nombre: string;
          creador_id: string;
          codigo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          creador_id: string;
          codigo?: string;
        };
        Update: {
          nombre?: string;
        };
      };
      grupo_miembros: {
        Row: {
          grupo_id: string;
          usuario_id: string;
          joined_at: string;
        };
        Insert: {
          grupo_id: string;
          usuario_id: string;
        };
        Update: never;
      };
      intercambios: {
        Row: {
          id: string;
          iniciador_id: string;
          receptor_id: string;
          numeros_pedidos: number[];
          numeros_ofrecidos: number[];
          estado: EstadoIntercambio;
          grupo_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          iniciador_id: string;
          receptor_id: string;
          numeros_pedidos?: number[];
          numeros_ofrecidos?: number[];
          estado?: EstadoIntercambio;
          grupo_id?: string | null;
        };
        Update: {
          numeros_pedidos?: number[];
          numeros_ofrecidos?: number[];
          estado?: EstadoIntercambio;
        };
      };
      mensajes: {
        Row: {
          id: string;
          intercambio_id: string;
          autor_id: string;
          contenido: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          intercambio_id: string;
          autor_id: string;
          contenido: string;
        };
        Update: never;
      };
    };
    Functions: {
      buscar_matches_radar: {
        Args: { p_usuario_id: string };
        Returns: import('@/types/app').MatchResult[];
      };
      buscar_matches_grupo: {
        Args: { p_grupo_id: string; p_usuario_id: string };
        Returns: import('@/types/app').MatchResult[];
      };
      finalizar_intercambio: {
        Args: { p_intercambio_id: string };
        Returns: void;
      };
      actualizar_ubicacion: {
        Args: { p_usuario_id: string; p_lat: number; p_lng: number };
        Returns: void;
      };
    };
  };
}
