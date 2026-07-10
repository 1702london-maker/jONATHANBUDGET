'use client'
import { Transaction, Flag, Account, Pot, PotMovement, MonthReview, AppSettings } from './types'

const KEYS = {
  transactions: 'jb_transactions',
  flags: 'jb_flags',
  accounts: 'jb_accounts',
  pots: 'jb_pots',
  potMovements: 'jb_pot_movements',
  monthReviews: 'jb_month_reviews',
  authed: 'jb_authed',
  knownNames: 'jb_known_names',
  settings: 'jb_settings',
}

function get<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[]
  } catch {
    return []
  }
}

function getOne<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function set<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

function setOne<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Settings ────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return (
    getOne<AppSettings>(KEYS.settings) ?? {
      spend_alert_threshold: 100,
      baseline_set: false,
      baseline_date: '2026-07-10',
    }
  )
}

export function saveSettings(s: AppSettings) {
  setOne(KEYS.settings, s)
}

// ── Transactions ─────────────────────────────────────────────

export function getTransactions(): Transaction[] {
  return get<Transaction>(KEYS.transactions).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function saveTransaction(tx: Transaction) {
  const all = get<Transaction>(KEYS.transactions)
  all.push(tx)
  set(KEYS.transactions, all)
  addKnownName(tx.counterparty_name)
  // Reduce card balance if this is a card payment
  if (tx.is_card_payment && tx.linked_card_id) {
    const accounts = get<Account>(KEYS.accounts)
    const idx = accounts.findIndex((a) => a.id === tx.linked_card_id)
    if (idx !== -1) {
      accounts[idx].current_balance = Math.max(
        0,
        accounts[idx].current_balance - tx.amount
      )
      accounts[idx].last_updated_at = new Date().toISOString()
      set(KEYS.accounts, accounts)
    }
  }
}

export function updateTransaction(updated: Transaction) {
  const all = get<Transaction>(KEYS.transactions)
  const idx = all.findIndex((t) => t.id === updated.id)
  if (idx !== -1) all[idx] = updated
  set(KEYS.transactions, all)
}

// ── Flags ────────────────────────────────────────────────────

export function getFlags(): Flag[] {
  return get<Flag>(KEYS.flags)
}

export function saveFlag(flag: Flag) {
  const all = get<Flag>(KEYS.flags)
  all.push(flag)
  set(KEYS.flags, all)
}

export function updateFlag(updated: Flag) {
  const all = get<Flag>(KEYS.flags)
  const idx = all.findIndex((f) => f.id === updated.id)
  if (idx !== -1) all[idx] = updated
  set(KEYS.flags, all)
}

// ── Accounts ─────────────────────────────────────────────────

export function getAccounts(): Account[] {
  return get<Account>(KEYS.accounts)
}

export function saveAccount(account: Account) {
  const all = get<Account>(KEYS.accounts)
  all.push(account)
  set(KEYS.accounts, all)
}

export function updateAccount(updated: Account) {
  const all = get<Account>(KEYS.accounts)
  const idx = all.findIndex((a) => a.id === updated.id)
  if (idx !== -1) all[idx] = updated
  set(KEYS.accounts, all)
}

export function deleteAccount(id: string) {
  const all = get<Account>(KEYS.accounts).filter((a) => a.id !== id)
  set(KEYS.accounts, all)
}

export function seedAccountsIfEmpty() {
  const all = get<Account>(KEYS.accounts)
  if (all.length > 0) return
  const now = new Date().toISOString()
  const defaults: Account[] = [
    { id: 'acc-1', name: 'Lloyds Club Lloyds', type: 'current', current_balance: 0, baseline_balance: 0, last_updated_at: now },
    { id: 'acc-2', name: 'Nationwide FlexDirect', type: 'current', current_balance: 0, baseline_balance: 0, last_updated_at: now },
    { id: 'acc-3', name: 'Amex Gold', type: 'credit', current_balance: 0, baseline_balance: 0, last_updated_at: now },
    { id: 'acc-4', name: 'John Lewis Partnership Card', type: 'credit', current_balance: 0, baseline_balance: 0, last_updated_at: now },
    { id: 'acc-5', name: 'Cash on Hand', type: 'cash', current_balance: 0, baseline_balance: 0, last_updated_at: now },
  ]
  set(KEYS.accounts, defaults)
}

// ── Pots ─────────────────────────────────────────────────────

export function getPots(): Pot[] {
  return get<Pot>(KEYS.pots).sort((a, b) => a.sort_order - b.sort_order)
}

export function savePot(pot: Pot) {
  const all = get<Pot>(KEYS.pots)
  all.push(pot)
  set(KEYS.pots, all)
}

export function updatePot(updated: Pot) {
  const all = get<Pot>(KEYS.pots)
  const idx = all.findIndex((p) => p.id === updated.id)
  if (idx !== -1) all[idx] = updated
  set(KEYS.pots, all)
}

export function deletePot(id: string) {
  set(KEYS.pots, get<Pot>(KEYS.pots).filter((p) => p.id !== id))
}

export function getPotMovements(potId?: string): PotMovement[] {
  const all = get<PotMovement>(KEYS.potMovements)
  return potId ? all.filter((m) => m.pot_id === potId) : all
}

export function savePotMovement(m: PotMovement) {
  const all = get<PotMovement>(KEYS.potMovements)
  all.push(m)
  set(KEYS.potMovements, all)
  // Also update pot balance
  const pots = get<Pot>(KEYS.pots)
  const idx = pots.findIndex((p) => p.id === m.pot_id)
  if (idx !== -1) {
    pots[idx].current_balance += m.direction === 'in' ? m.amount : -m.amount
    set(KEYS.pots, pots)
  }
}

export function seedPotsIfEmpty() {
  const all = get<Pot>(KEYS.pots)
  if (all.length > 0) return
  const today = new Date()
  const defaults: Pot[] = [
    { id: 'pot-cfo', name: 'CFO Retainer', target_amount: 1500, current_balance: 0, due_day: 1, last_paid_at: undefined, sort_order: 0 },
    { id: 'pot-reserve', name: 'Reserve', target_amount: undefined, current_balance: 0, sort_order: 1 },
    { id: 'pot-tax', name: 'Tax', target_amount: undefined, current_balance: 0, sort_order: 2 },
    { id: 'pot-growth', name: 'Growth', target_amount: undefined, current_balance: 0, sort_order: 3 },
    { id: 'pot-savings', name: 'Personal Savings', target_amount: undefined, current_balance: 0, sort_order: 4 },
  ]
  set(KEYS.pots, defaults)
}

// ── Month Reviews ─────────────────────────────────────────────

export function getMonthReviews(): MonthReview[] {
  return get<MonthReview>(KEYS.monthReviews)
}

export function saveMonthReview(r: MonthReview) {
  const all = get<MonthReview>(KEYS.monthReviews)
  const idx = all.findIndex((m) => m.id === r.id)
  if (idx !== -1) all[idx] = r
  else all.push(r)
  set(KEYS.monthReviews, all)
}

// ── Names ─────────────────────────────────────────────────────

export function getKnownNames(): string[] {
  return get<string>(KEYS.knownNames)
}

export function addKnownName(name: string) {
  if (!name.trim()) return
  const all = get<string>(KEYS.knownNames)
  if (!all.includes(name.trim())) {
    all.push(name.trim())
    set(KEYS.knownNames, all)
  }
}

// ── Auth ──────────────────────────────────────────────────────

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEYS.authed) === 'true'
}

export function setAuthed(val: boolean) {
  if (typeof window === 'undefined') return
  if (val) localStorage.setItem(KEYS.authed, 'true')
  else localStorage.removeItem(KEYS.authed)
}
