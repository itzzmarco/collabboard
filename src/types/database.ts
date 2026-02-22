export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; avatar_color: string; created_at: string }
        Insert: { id: string; display_name?: string; avatar_color?: string; created_at?: string }
        Update: { display_name?: string; avatar_color?: string }
      }
      boards: {
        Row: { id: string; owner_id: string; title: string; created_at: string; updated_at: string }
        Insert: { id?: string; owner_id: string; title?: string; created_at?: string; updated_at?: string }
        Update: { title?: string; updated_at?: string }
      }
      board_share_tokens: {
        Row: { id: string; board_id: string; permission: 'view' | 'edit'; token: string; expires_at: string; created_at: string }
        Insert: { id?: string; board_id: string; permission: 'view' | 'edit'; token?: string; expires_at?: string; created_at?: string }
        Update: { expires_at?: string }
      }
      cards: {
        Row: { id: string; board_id: string; type: string; x: number; y: number; width: number; height: number; content: string; color_index: number; client_mutation_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; board_id: string; type?: string; x?: number; y?: number; width?: number; height?: number; content?: string; color_index?: number; client_mutation_id?: string | null; created_at?: string; updated_at?: string }
        Update: { type?: string; x?: number; y?: number; width?: number; height?: number; content?: string; color_index?: number; client_mutation_id?: string | null; updated_at?: string }
      }
      drawing_paths: {
        Row: { id: string; board_id: string; color: string; size: number; points: Json; client_mutation_id: string | null; created_at: string }
        Insert: { id?: string; board_id: string; color?: string; size?: number; points?: Json; client_mutation_id?: string | null; created_at?: string }
        Update: never
      }
    }
  }
}
