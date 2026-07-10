'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getFlags, getTransactions, isAuthed } from '@/lib/db'
import { useRealtime } from '@/lib/useRealtime'
import { Flag, Transaction } from '@/lib/types'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import TransactionCard from '@/components/TransactionCard'
import FlagModal from '@/components/FlagModal'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function FlagsPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<Flag[]>([])
  const [txMap, setTxMap] = useState<Record<string, Transaction>>({})
  const [flagTarget, setFlagTarget] = useState<Transaction | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  const load = useCallback(async () => {
    const [allFlags, allTx] = await Promise.all([getFlags(), getTransactions()])
    setFlags(allFlags)
    setTxMap(Object.fromEntries(allTx.map((t) => [t.id, t])))
    setLoading(false)
  }, [])

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }
    load()
  }, [load, router])

  useRealtime(['flags', 'transactions'], load)

  const open = flags.filter((f) => !f.resolved)
  const resolved = flags.filter((f) => f.resolved)
  const shown = showResolved ? resolved : open

  if (authed === null) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header streak={0} />
      <main className="pb-24 px-4 pt-4 space-y-4 max-w-lg mx-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setShowResolved(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition flex items-center justify-center gap-2 ${!showResolved ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            <AlertTriangle size={14} /> Open ({open.length})
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition flex items-center justify-center gap-2 ${showResolved ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            <CheckCircle size={14} /> Resolved ({resolved.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="text-teal-400 animate-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {showResolved
              ? <p className="font-serif text-xl text-slate-300">No resolved flags yet</p>
              : (
                <>
                  <CheckCircle size={36} className="text-teal-200 mx-auto mb-3" />
                  <p className="font-serif text-xl text-slate-600 font-medium">Nothing needs a conversation</p>
                  <p className="text-sm mt-1">Flag a transaction from the home screen or history to raise it here.</p>
                </>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((flag) => {
              const tx = txMap[flag.transaction_id]
              if (!tx) return null
              return (
                <div key={flag.id} className="space-y-2">
                  <TransactionCard tx={tx} onFlag={!flag.resolved ? () => setFlagTarget(tx) : undefined} flagNote={flag.note} />
                  {flag.resolved && flag.resolution_note && (
                    <div className="ml-3 pl-3 border-l-2 border-teal-200">
                      <p className="text-xs text-teal-700 font-medium">Resolved: {flag.resolution_note}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(flag.created_at)}</p>
                    </div>
                  )}
                  {!flag.resolved && (
                    <button onClick={() => setFlagTarget(tx)} className="ml-1 text-xs text-teal-600 font-semibold hover:underline">
                      Mark as discussed and resolved
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      <BottomNav />
      {flagTarget && (
        <FlagModal
          tx={flagTarget}
          existingFlag={flags.find((f) => f.transaction_id === flagTarget.id)}
          onClose={() => { setFlagTarget(null); load() }}
        />
      )}
    </div>
  )
}
