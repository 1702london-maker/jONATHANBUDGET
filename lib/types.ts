export type Direction = 'in' | 'out'
export type Method = 'cash' | 'card' | 'transfer'
export type Category =
  | 'food'
  | 'transport'
  | 'nightlife'
  | 'personal_transfer'
  | 'business'
  | 'subscription'
  | 'other'
export type BusinessOrPersonal = 'business' | 'personal'

export interface Transaction {
  id: string
  amount: number
  direction: Direction
  method: Method
  counterparty_name: string
  category: Category
  business_or_personal: BusinessOrPersonal
  note?: string
  receipt_url?: string
  is_card_payment: boolean
  linked_card_id?: string
  created_at: string
  flagged: boolean
}

export interface Flag {
  id: string
  transaction_id: string
  note: string
  created_at: string
  resolved: boolean
  resolution_note?: string
}

export interface Account {
  id: string
  name: string
  type: 'current' | 'credit' | 'cash'
  current_balance: number
  baseline_balance: number
  last_updated_at: string
}

export interface Pot {
  id: string
  name: string
  target_amount?: number
  current_balance: number
  due_day?: number
  last_paid_at?: string
  sort_order: number
}

export interface PotMovement {
  id: string
  pot_id: string
  amount: number
  direction: 'in' | 'out'
  note?: string
  created_at: string
}

export interface DailySummary {
  id: string
  date: string
  total_in: number
  total_out: number
  cash_total: number
  entries_count: number
}

export interface MonthReview {
  id: string
  month: string
  logged_total_out: number
  logged_total_in: number
  balance_change_total: number
  matched: boolean
  discrepancy_note?: string
  reviewed_at?: string
}

export interface AppSettings {
  spend_alert_threshold: number
  baseline_set: boolean
  baseline_date: string
}

export interface QuickChip {
  label: string
  who: string
  category: Category
}
