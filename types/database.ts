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
          faltantes: string[];
          repetidas: string[];
          visible_radar: boolean;
          total_figuritas: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          alias: string;
          ubicacion?: unknown | null;
          radio_km?: number;
          faltantes?: string[];
          repetidas?: string[];
          visible_radar?: boolean;
          total_figuritas?: number;
        };
        Update: {
          alias?: string;
          ubicacion?: unknown | null;
          radio_km?: number;
          faltantes?: string[];
          repetidas?: string[];
          visible_radar?: boolean;
          total_figuritas?: number;
        };
      };
      user_albumes: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          faltantes: string[];
          repetidas: string[];
          total_figuritas: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          faltantes?: string[];
          repetidas?: string[];
          total_figuritas?: number;
          is_active?: boolean;
        };
        Update: {
          nombre?: string;
          faltantes?: string[];
          repetidas?: string[];
          total_figuritas?: number;
          is_active?: boolean;
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
          numeros_pedidos: string[];
          numeros_ofrecidos: string[];
          estado: EstadoIntercambio;
          grupo_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          iniciador_id: string;
          receptor_id: string;
          numeros_pedidos?: string[];
          numeros_ofrecidos?: string[];
          estado?: EstadoIntercambio;
          grupo_id?: string | null;
        };
        Update: {
          numeros_pedidos?: string[];
          numeros_ofrecidos?: string[];
          estado?: EstadoIntercambio;
        };
      };
      mensajes: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          contenido: string;
          intercambio_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          contenido: string;
          intercambio_id?: string | null;
        };
        Update: never;
      };
    };
    Functions: {
      buscar_matches_radar: {
        Args: { p_usuario_id: string };
        Returns: Array<{
          usuario_id: string;
          alias: string;
          distancia_km: number;
          ellos_tienen_yo_busco: string[];
          yo_tengo_ellos_buscan: string[];
          total_coincidencias: number;
          es_bidireccional: boolean;
        }>;
      };
      buscar_matches_grupo: {
        Args: { p_grupo_id: string; p_usuario_id: string };
        Returns: Array<{
          usuario_id: string;
          alias: string;
          ellos_tienen_yo_busco: string[];
          yo_tengo_ellos_buscan: string[];
          total_coincidencias: number;
          es_bidireccional: boolean;
        }>;
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
