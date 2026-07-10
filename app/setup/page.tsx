'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccounts, upsertAccount, getPots, upsertPot, getSettings, updateSettings, isAuthed } from '@/lib/db'
import { formatCurrency, calcNetCurrent, calcNetPosition } from '@/lib/utils'
import { Account, Pot } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-lloyds', name: 'Lloyds Current', type: 'current', current_balance: 0, baseline_balance: 0, last_updated_at: new Date().toISOString() },
  { id: 'acc-cash', name: 'Cash', type: 'cash', current_balance: 0, baseline_balance: 0, last_updated_at: new Date().toISOString() },
  { id: 'acc-amex', name: 'Amex', type: 'credit', current_balance: 0, baseline_balance: 0, last_updated_at: new Date().toISOString() },
  { id: 'acc-barclaycard', name: 'Barclaycard', type: 'credit', current_balance: 0, baseline_balance: 0, last_updated_at: new Date().toISOString() },
]

const DEFAULT_POTS: Pot[] = [
  { id: 'pot-cfo', name: 'CFO Retainer', target_amount: 1500, current_balance: 0, due_day: 1, last_paid_at: undefined, sort_order: 0 },
  { id: 'pot-reserve', name: 'Reserve', current_balance: 0, sort_order: 1 },
  { id: 'pot-tax', name: 'Tax', current_balance: 0, sort_order: 2 },
  { id: 'pot-growth', name: 'Growth', current_balance: 0, sort_order: 3 },
  { id: 'pot-savings', name: 'Personal Savings', current_balance: 0, sort_order: 4 },
]

export default function SetupPage() {
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthed()) { router.replace('/'); return }

    async function init() {
      const [existingAccounts, existingPots, settings] = await Promise.all([
        getAccounts(), getPots(), getSettings(),
      ])

      if (existingAccounts.length > 0) {
        setAccounts(existingAccounts)
      } else {
        await Promise.all(DEFAULT_ACCOUNTS.map((a) => upsertAccount(a)))
      }
      if (existingPots.length === 0) {
        await Promise.all(DEFAULT_POTS.map((p) => upsertPot(p)))
      }
      setReady(true)
    }
    init()
  }, [router])

  const currentAccounts = accounts.filter((a) => a.type === 'current' || a.type === 'cash')
  const creditAccounts = accounts.filter((a) => a.type === 'credit')
  const netCurrent = calcNetCurrent(accounts)
  const netPosition = calcNetPosition(accounts)

  function setBalance(id: string, val: string) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, current_balance: parseFloat(val) || 0 } : a)))
  }

  async function handleSave() {
    setSaving(true)
    const now = new Date().toISOString()
    await Promise.all(accounts.map((a) => upsertAccount({ ...a, baseline_balance: a.current_balance, last_updated_at: now })))
    await updateSettings({ baseline_set: true, baseline_date: now.slice(0, 10) })
    router.replace('/')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="text-teal-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 pb-16">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-slate-800 mb-1">Baseline balances</h1>
          <p className="text-slate-500 text-sm">
            Set the correct opening balance for each account. This is the starting point everything is measured from.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-700 mb-3">Current accounts and cash</h2>
            <div className="space-y-2">
              {currentAccounts.map((acc) => (
                <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-sm font-medium text-slate-600 mb-2">{acc.name}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-lg">£</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={acc.current_balance || ''}
                      onChange={(e) => setBalance(acc.id, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 text-lg font-semibold text-teal-700 border-none outline-none bg-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-700 mb-1">Credit card balances</h2>
            <p className="text-xs text-slate-400 mb-3">What you currently owe on each card, not the limit.</p>
            <div className="space-y-2">
              {creditAccounts.map((acc) => (
                <div key={acc.id} className="bg-white rounded-xl border border-red-100 p-4">
                  <label className="block text-sm font-medium text-slate-600 mb-2">{acc.name}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-red-300 text-lg">£</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={acc.current_balance || ''}
                      onChange={(e) => setBalance(acc.id, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 text-lg font-semibold text-red-600 border-none outline-none bg-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-3">
            <h2 className="font-serif text-base font-semibold text-teal-800">Current position</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-0.5">Net Current</p>
                <p className={`text-xl font-bold ${netCurrent >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{formatCurrency(netCurrent)}</p>
                <p className="text-xs text-teal-500 mt-0.5">Funds available now</p>
              </div>
              <div>
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-0.5">Net Position</p>
                <p className={`text-xl font-bold ${netPosition >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{formatCurrency(netPosition)}</p>
                <p className="text-xs text-teal-500 mt-0.5">After card debts</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-teal-600 text-white font-bold text-lg py-4 rounded-2xl transition hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={20} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save baseline'}
          </button>
        </div>
      </div>
    </div>
  )
}
