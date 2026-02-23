export type { Database, Json } from './database'

export interface Card {
  id: string
  board_id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  content: string
  color_index: number
  client_mutation_id: string | null
  created_at: string
  updated_at: string
}

export interface DrawingPath {
  id: string
  board_id: string
  color: string
  size: number
  points: Array<{ x: number; y: number }>
  client_mutation_id: string | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string
  avatar_color: string
  created_at: string
  email?: string
}

export interface Board {
  id: string
  owner_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface BoardShareToken {
  id: string
  board_id: string
  permission: 'view' | 'edit'
  token: string
  expires_at: string
  created_at: string
}

export interface HistoryEntry {
  type: 'card_add' | 'card_update' | 'card_delete' | 'path_add' | 'path_delete'
  entityId: string
  before: Partial<Card> | Partial<DrawingPath> | null
  after: Partial<Card> | Partial<DrawingPath> | null
}

export interface PresenceCursor {
  userId: string
  displayName: string
  avatarColor: string
  x: number
  y: number
}

export interface BroadcastCardDrag {
  cardId: string
  x: number
  y: number
}

export interface BroadcastStroke {
  color: string
  size: number
  points: Array<{ x: number; y: number }>
}

export interface BillingState {
  plan: 'free' | 'pro' | 'team'
  subscription_status: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  cancel_at_period_end: boolean
  past_due_grace_until: string | null
}
