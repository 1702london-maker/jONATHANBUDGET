import { supabase } from './supabase'
import { Transaction, Flag, Account, Pot, PotMovement, MonthReview, AppSettings } from './types'

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as Transaction[]) ?? []
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  await supabase.from('transactions').insert(tx)

  // Reduce card balance automatically if this is a card payment
  if (tx.is_card_payment && tx.linked_card_id) {
    const { data: acc } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', tx.linked_card_id)
      .single()
    if (acc) {
      const newBalance = Math.max(0, Number(acc.current_balance) - tx.amount)
      await supabase
        .from('accounts')
        .update({ current_balance: newBalance, last_updated_at: new Date().toISOString() })
        .eq('id', tx.linked_card_id)
    }
  }

  // Add to known names (derived from transactions — no separate table needed)
}

export async function updateTransaction(tx: Partial<Transaction> & { id: string }): Promise<void> {
  await supabase.from('transactions').update(tx).eq('id', tx.id)
}

// ── Flags ─────────────────────────────────────────────────────────────────────

export async function getFlags(): Promise<Flag[]> {
  const { data } = await supabase
    .from('flags')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as Flag[]) ?? []
}

export async function saveFlag(flag: Flag): Promise<void> {
  await supabase.from('flags').insert(flag)
  await supabase.from('transactions').update({ flagged: true }).eq('id', flag.transaction_id)
}

export async function updateFlag(flag: Partial<Flag> & { id: string }): Promise<void> {
  await supabase.from('flags').update(flag).eq('id', flag.id)
  if (flag.resolved) {
    await supabase.from('transactions').update({ flagged: false }).eq('id', (flag as Flag).transaction_id)
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })
  return (data as Account[]) ?? []
}

export async function upsertAccount(account: Account): Promise<void> {
  await supabase.from('accounts').upsert(account)
}

export async function deleteAccount(id: string): Promise<void> {
  await supabase.from('accounts').delete().eq('id', id)
}

// ── Pots ──────────────────────────────────────────────────────────────────────

export async function getPots(): Promise<Pot[]> {
  const { data } = await supabase
    .from('pots')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data as Pot[]) ?? []
}

export async function upsertPot(pot: Partial<Pot> & { id: string }): Promise<void> {
  await supabase.from('pots').upsert(pot)
}

export async function getPotMovements(potId?: string): Promise<PotMovement[]> {
  let query = supabase
    .from('pot_movements')
    .select('*')
    .order('created_at', { ascending: false })
  if (potId) query = query.eq('pot_id', potId)
  const { data } = await query
  return (data as PotMovement[]) ?? []
}

export async function savePotMovement(m: PotMovement): Promise<void> {
  await supabase.from('pot_movements').insert(m)
  // Update pot balance
  const { data: pot } = await supabase
    .from('pots')
    .select('current_balance')
    .eq('id', m.pot_id)
    .single()
  if (pot) {
    const newBalance = Number(pot.current_balance) + (m.direction === 'in' ? m.amount : -m.amount)
    await supabase.from('pots').update({ current_balance: newBalance }).eq('id', m.pot_id)
  }
}

// ── Month reviews ─────────────────────────────────────────────────────────────

export async function getMonthReviews(): Promise<MonthReview[]> {
  const { data } = await supabase.from('month_reviews').select('*').order('month', { ascending: false })
  return (data as MonthReview[]) ?? []
}

export async function upsertMonthReview(r: MonthReview): Promise<void> {
  await supabase.from('month_reviews').upsert(r)
}

// ── App settings ──────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single()
  return (data as AppSettings) ?? { spend_alert_threshold: 100, baseline_set: false, baseline_date: '2026-07-10' }
}

export async function updateSettings(s: Partial<AppSettings>): Promise<void> {
  await supabase.from('app_settings').update(s).eq('id', 1)
}

// ── Known names (derived from transactions) ───────────────────────────────────

export async function getKnownNames(): Promise<string[]> {
  const { data } = await supabase
    .from('transactions')
    .select('counterparty_name')
    .neq('counterparty_name', '')
  if (!data) return []
  return [...new Set(data.map((r: { counterparty_name: string }) => r.counterparty_name))].sort()
}

// ── Auth (local only — single shared password) ────────────────────────────────

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('jb_authed') === 'true'
}

export function setAuthed(val: boolean): void {
  if (typeof window === 'undefined') return
  if (val) localStorage.setItem('jb_authed', 'true')
  else localStorage.removeItem('jb_authed')
}
