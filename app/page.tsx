'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthed, getTransactions, getFlags, getAccounts, getPots, getSettings } from '@/lib/db'
import { useRealtime } from '@/lib/useRealtime'
import {
  formatCurrency, calcStreak, todayStats, monthStats,
  byCategory, byPerson, CATEGORY_LABELS, CATEGORY_BAR_COLORS,
  calcNetCurrent, calcNetPosition, calcCashAtHand, calcTotalCreditOwed,
  isCfoRetainerOverdue,
} from '@/lib/utils'
import { Transaction, Account, Pot } from '@/lib/types'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import LoginGate from '@/components/LoginGate'
import TransactionCard from '@/components/TransactionCard'
import FlagModal from '@/components/FlagModal'
import { PlusCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [flags, setFlags] = useState<Awaited<ReturnType<typeof getFlags>>>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pots, setPots] = useState<Pot[]>([])
  const [flagTarget, setFlagTarget] = useState<Transaction | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    const [txs, fls, accs, pts] = await Promise.all([
      getTransactions(), getFlags(), getAccounts(), getPots(),
    ])
    setTransactions(txs)
    setFlags(fls)
    setAccounts(accs)
    setPots(pts)
    setLoading(false)
  }, [])

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
  }, [])

  useEffect(() => {
    if (!authed) return
    getSettings().then((s) => {
      if (!s.baseline_set) { router.replace('/setup'); return }
      load()
    })
  }, [authed, load, router])

  // Real-time: any change on any device instantly refreshes everyone
  useRealtime(['transactions', 'flags', 'accounts', 'pots', 'pot_movements'], load)

  if (authed === null) return null
  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="text-teal-400 animate-spin" />
      </div>
    )
  }

  const streak = calcStreak(transactions)
  const today = todayStats(transactions)
  const month = monthStats(transactions)
  const categories = byCategory(transactions)
  const people = byPerson(transactions, 30)
  const topCategoryTotal = categories[0]?.total || 1

  const openFlags = flags.filter((f) => !f.resolved)
  const flagMap = Object.fromEntries(flags.map((f) => [f.transaction_id, f]))
  const recentTx = transactions.slice(0, 5)

  const netCurrent = calcNetCurrent(accounts)
  const netPosition = calcNetPosition(accounts)
  const cashAtHand = calcCashAtHand(accounts)
  const creditOwed = calcTotalCreditOwed(accounts)
  const creditAccounts = accounts.filter((a) => a.type === 'credit')
  const cfoRetainer = pots.find((p) => p.id === 'pot-cfo')
  const cfoOverdue = cfoRetainer ? isCfoRetainerOverdue(cfoRetainer) : false

  const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
  const hadYesterdayEntry = transactions.some((t) => t.created_at.startsWith(yesterdayStr))
  const showMissedPrompt = !hadYesterdayEntry && transactions.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Header streak={streak} />

      <main className="pb-24 px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {showMissedPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm font-medium">
              No entries were logged yesterday. Was there genuinely nothing to record, or does something need adding now?
            </p>
          </div>
        )}

        {cfoOverdue && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-bold text-sm">CFO Retainer overdue</p>
              <p className="text-red-600 text-xs mt-0.5">The £1,500 monthly retainer is due and has not been marked as paid.</p>
              <Link href="/pots" className="text-red-700 font-semibold text-xs underline mt-1 inline-block">Go to Pots</Link>
            </div>
          </div>
        )}

        {openFlags.length > 0 && (
          <Link href="/flags" className="block bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-red-700 font-semibold text-sm">
                {openFlags.length} item{openFlags.length !== 1 ? 's' : ''} need a conversation
              </span>
            </div>
          </Link>
        )}

        <Link
          href="/log"
          className="flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-2xl py-5 transition shadow-md shadow-teal-100"
        >
          <PlusCircle size={24} />
          <span className="font-bold text-xl">Log It</span>
        </Link>

        {/* Net Current and Net Position */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Net Current</p>
            <p className={`text-xl font-bold leading-tight ${netCurrent >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              {formatCurrency(netCurrent)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Available now, before debts</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Net Position</p>
            <p className={`text-xl font-bold leading-tight ${netPosition >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              {formatCurrency(netPosition)}
            </p>
            <p className="text-xs text-slate-400 mt-1">After all card balances</p>
          </div>
        </div>

        {/* Cash, cards, left to pay */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Cash at hand</span>
            <span className="font-bold text-slate-800">{formatCurrency(cashAtHand)}</span>
          </div>
          <div className="h-px bg-slate-100" />
          {creditAccounts.map((acc) => (
            <div key={acc.id} className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{acc.name}</span>
              <span className="font-semibold text-red-600">{formatCurrency(acc.current_balance)}</span>
            </div>
          ))}
          {creditAccounts.length > 0 && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">Left to pay on cards</span>
                <span className="font-bold text-red-600">{formatCurrency(creditOwed)}</span>
              </div>
            </>
          )}
        </div>

        {/* Pots summary strip */}
        {pots.length > 0 && (
          <Link href="/pots" className="block">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-base font-semibold text-slate-700">Pots</h2>
                <span className="text-xs text-teal-600 font-semibold">View all</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {pots.map((pot) => {
                  const overdue = isCfoRetainerOverdue(pot)
                  return (
                    <div
                      key={pot.id}
                      className={`flex-shrink-0 rounded-xl px-3 py-2.5 border min-w-[110px] ${
                        overdue ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <p className={`text-xs font-semibold mb-1 truncate ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                        {pot.name}
                      </p>
                      <p className={`text-base font-bold ${overdue ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatCurrency(pot.current_balance)}
                      </p>
                      {pot.target_amount && (
                        <p className="text-xs text-slate-400 mt-0.5">of {formatCurrency(pot.target_amount)}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Link>
        )}

        {/* Today / month stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-serif text-base font-semibold text-slate-700 mb-3">Today</h2>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <MiniStat label="In" value={formatCurrency(today.totalIn)} color="text-green-600" />
            <MiniStat label="Out" value={formatCurrency(today.totalOut)} color="text-red-600" />
            <MiniStat label="Cash out" value={formatCurrency(today.cashOut)} color="text-orange-600" />
          </div>
          <div className="h-px bg-slate-100 mb-3" />
          <h2 className="font-serif text-base font-semibold text-slate-700 mb-3">This month</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="In" value={formatCurrency(month.totalIn)} color="text-green-600" />
            <MiniStat label="Out" value={formatCurrency(month.totalOut)} color="text-red-600" />
            <MiniStat
              label="Net"
              value={`${month.net >= 0 ? '+' : ''}${formatCurrency(month.net)}`}
              color={month.net >= 0 ? 'text-teal-600' : 'text-red-600'}
            />
          </div>
        </div>

        {/* Category breakdown */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-serif text-lg font-semibold text-slate-800 mb-3">Spending by category</h2>
            <div className="space-y-2.5">
              {categories.map(({ category, total }) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{CATEGORY_LABELS[category]}</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (total / topCategoryTotal) * 100)}%`,
                        backgroundColor: CATEGORY_BAR_COLORS[category],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By person */}
        {people.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-serif text-lg font-semibold text-slate-800 mb-1">Money sent — last 30 days</h2>
            <div className="divide-y divide-slate-100">
              {people.map(({ name, total }, i) => (
                <div key={name} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 font-medium">{name}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent entries */}
        {recentTx.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-lg font-semibold text-slate-800">Recent entries</h2>
              <Link href="/history" className="text-xs text-teal-600 font-semibold">View all</Link>
            </div>
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} onFlag={setFlagTarget} flagNote={flagMap[tx.id]?.note} />
              ))}
            </div>
          </div>
        )}

        {transactions.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-serif text-2xl text-slate-300 mb-2">Nothing logged yet</p>
            <p className="text-sm">Tap Log It above to record your first entry.</p>
          </div>
        )}
      </main>

      <BottomNav />

      {flagTarget && (
        <FlagModal
          tx={flagTarget}
          existingFlag={flagMap[flagTarget.id]}
          onClose={() => { setFlagTarget(null); load() }}
        />
      )}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}
