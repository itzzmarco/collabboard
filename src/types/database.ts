export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; avatar_color: string; created_at: string; stripe_customer_id: string | null; plan: 'free' | 'pro' | 'team'; subscription_status: string | null; stripe_subscription_id: string | null; stripe_price_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean; past_due_grace_until: string | null }
        Insert: { id: string; display_name?: string; avatar_color?: string; created_at?: string; stripe_customer_id?: string | null; plan?: 'free' | 'pro' | 'team'; subscription_status?: string | null; stripe_subscription_id?: string | null; stripe_price_id?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; past_due_grace_until?: string | null }
        Update: { display_name?: string; avatar_color?: string; stripe_customer_id?: string | null; plan?: 'free' | 'pro' | 'team'; subscription_status?: string | null; stripe_subscription_id?: string | null; stripe_price_id?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; past_due_grace_until?: string | null }
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
      board_editor_sessions: {
        Row: { board_id: string; user_id: string; last_seen_at: string }
        Insert: { board_id: string; user_id: string; last_seen_at?: string }
        Update: { last_seen_at?: string }
      }
    }
  }
}
