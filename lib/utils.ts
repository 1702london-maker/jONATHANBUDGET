import { Transaction, Category, Account, Pot } from './types'
import { format, isToday, isThisMonth, subDays, startOfDay, getDate, getDaysInMonth } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM yyyy, HH:mm')
}

export function formatShortDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM')
}

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food',
  transport: 'Transport',
  nightlife: 'Nightlife / Entertainment',
  personal_transfer: 'Personal Transfer',
  business: 'Business Expense',
  subscription: 'Subscription',
  other: 'Other',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  food: 'bg-green-100 text-green-700',
  transport: 'bg-blue-100 text-blue-700',
  nightlife: 'bg-purple-100 text-purple-700',
  personal_transfer: 'bg-orange-100 text-orange-700',
  business: 'bg-teal-100 text-teal-700',
  subscription: 'bg-slate-100 text-slate-600',
  other: 'bg-slate-100 text-slate-600',
}

export const CATEGORY_BAR_COLORS: Record<Category, string> = {
  food: '#22C55E',
  transport: '#3B82F6',
  nightlife: '#A855F7',
  personal_transfer: '#F97316',
  business: '#14B8A6',
  subscription: '#94A3B8',
  other: '#CBD5E1',
}

export function calcStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0
  const today = startOfDay(new Date())
  if (!isToday(new Date(transactions[0].created_at))) return 0
  const loggedDays = new Set(
    transactions.map((t) => format(new Date(t.created_at), 'yyyy-MM-dd'))
  )
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const day = format(subDays(today, i), 'yyyy-MM-dd')
    if (loggedDays.has(day)) streak++
    else break
  }
  return streak
}

export function todayStats(transactions: Transaction[]) {
  const todayTxs = transactions.filter((t) => isToday(new Date(t.created_at)))
  const totalIn = todayTxs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = todayTxs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const cashIn = todayTxs.filter((t) => t.method === 'cash' && t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const cashOut = todayTxs.filter((t) => t.method === 'cash' && t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  return { totalIn, totalOut, cashIn, cashOut, count: todayTxs.length }
}

export function monthStats(transactions: Transaction[]) {
  const monthTxs = transactions.filter((t) => isThisMonth(new Date(t.created_at)))
  const totalIn = monthTxs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = monthTxs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  return { totalIn, totalOut, net: totalIn - totalOut }
}

export function byCategory(transactions: Transaction[]) {
  const map: Partial<Record<Category, number>> = {}
  transactions
    .filter((t) => t.direction === 'out' && isThisMonth(new Date(t.created_at)))
    .forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
  return Object.entries(map)
    .map(([cat, total]) => ({ category: cat as Category, total: total as number }))
    .sort((a, b) => b.total - a.total)
}

export function byPerson(transactions: Transaction[], days = 30) {
  const cutoff = subDays(new Date(), days)
  const map: Record<string, number> = {}
  transactions
    .filter((t) => t.direction === 'out' && new Date(t.created_at) >= cutoff && t.counterparty_name)
    .forEach((t) => {
      map[t.counterparty_name] = (map[t.counterparty_name] || 0) + t.amount
    })
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

export function calcNetCurrent(accounts: Account[]): number {
  return accounts
    .filter((a) => a.type === 'current' || a.type === 'cash')
    .reduce((s, a) => s + Number(a.current_balance), 0)
}

export function calcNetPosition(accounts: Account[]): number {
  const current = calcNetCurrent(accounts)
  const creditDebt = accounts
    .filter((a) => a.type === 'credit')
    .reduce((s, a) => s + Number(a.current_balance), 0)
  return current - creditDebt
}

export function calcCashAtHand(accounts: Account[]): number {
  return accounts
    .filter((a) => a.type === 'cash')
    .reduce((s, a) => s + Number(a.current_balance), 0)
}

export function calcTotalCreditOwed(accounts: Account[]): number {
  return accounts
    .filter((a) => a.type === 'credit')
    .reduce((s, a) => s + Number(a.current_balance), 0)
}

export function calcTotalPots(pots: Pot[]): number {
  return pots.reduce((s, p) => s + Number(p.current_balance), 0)
}

export function calcTrueNetWorth(accounts: Account[], pots: Pot[]): number {
  return calcNetPosition(accounts) + calcTotalPots(pots)
}

export function isCfoRetainerOverdue(pot: Pot): boolean {
  if (pot.id !== 'pot-cfo') return false
  if (!pot.due_day) return false
  const today = new Date()
  const dayOfMonth = getDate(today)
  if (!pot.last_paid_at) return dayOfMonth >= pot.due_day
  const lastPaid = new Date(pot.last_paid_at)
  const lastPaidMonth = lastPaid.getMonth()
  const lastPaidYear = lastPaid.getFullYear()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  if (currentYear > lastPaidYear || currentMonth > lastPaidMonth) {
    return dayOfMonth >= pot.due_day
  }
  return false
}

export function cfoRetainerDaysUntilDue(pot: Pot): number {
  if (!pot.due_day) return 0
  const today = new Date()
  const daysInMonth = getDaysInMonth(today)
  const dayOfMonth = getDate(today)
  const dueThisMonth = pot.due_day
  if (dayOfMonth <= dueThisMonth) {
    return dueThisMonth - dayOfMonth
  }
  return daysInMonth - dayOfMonth + dueThisMonth
}
