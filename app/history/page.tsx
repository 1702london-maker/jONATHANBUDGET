'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Transaction, Flag, Category, Method } from '@/lib/types'
import { getTransactions, getFlags, isAuthed } from '@/lib/db'
import { useRealtime } from '@/lib/useRealtime'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TransactionCard from '@/components/TransactionCard'
import FlagModal from '@/components/FlagModal'
import { Search, Loader2 } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/utils'

export default function HistoryPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState<Method | 'all'>('all')
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [flagTarget, setFlagTarget] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    const [txs, fls] = await Promise.all([getTransactions(), getFlags()])
    setTransactions(txs)
    setFlags(fls)
    setLoading(false)
  }, [])

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }
    load()
  }, [load, router])

  useRealtime(['transactions', 'flags'], load)

  const flagMap = Object.fromEntries(flags.map((f) => [f.transaction_id, f]))

  const filtered = transactions.filter((t) => {
    const matchSearch = search.length === 0 ||
      t.counterparty_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.note || '').toLowerCase().includes(search.toLowerCase())
    const matchMethod = filterMethod === 'all' || t.method === filterMethod
    const matchCat = filterCat === 'all' || t.category === filterCat
    return matchSearch && matchMethod && matchCat
  })

  if (authed === null) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header streak={0} />
      <main className="pb-24 px-4 pt-4 space-y-3 max-w-lg mx-auto">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name or note" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 bg-white" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['all', 'cash', 'card', 'transfer'] as const).map((m) => (
            <button key={m} onClick={() => setFilterMethod(m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition capitalize ${filterMethod === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              {m === 'all' ? 'All methods' : m}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => setFilterCat('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filterCat === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            All categories
          </button>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filterCat === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="text-teal-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="font-serif text-2xl text-slate-300 mb-2">No entries found</p>
            <p className="text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">{filtered.length} entries</p>
            {filtered.map((tx) => (
              <TransactionCard key={tx.id} tx={tx} onFlag={setFlagTarget} flagNote={flagMap[tx.id]?.note} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
      {flagTarget && (
        <FlagModal tx={flagTarget} existingFlag={flagMap[flagTarget.id]}
          onClose={() => { setFlagTarget(null); load() }} />
      )}
    </div>
  )
}
