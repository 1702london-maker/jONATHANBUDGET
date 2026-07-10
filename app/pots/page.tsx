'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pot, PotMovement } from '@/lib/types'
import { getPots, upsertPot, savePotMovement, getPotMovements, isAuthed } from '@/lib/db'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, formatDate, isCfoRetainerOverdue, cfoRetainerDaysUntilDue } from '@/lib/utils'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { v4 as uuidv4 } from 'uuid'
import { CheckCircle, AlertCircle, Plus, Minus, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react'

export default function PotsPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [pots, setPots] = useState<Pot[]>([])
  const [expanded, setExpanded] = useState<string | null>('pot-cfo')
  const [moveAmount, setMoveAmount] = useState<Record<string, string>>({})
  const [moveNote, setMoveNote] = useState<Record<string, string>>({})
  const [movements, setMovements] = useState<Record<string, PotMovement[]>>({})

  const load = useCallback(async () => {
    const allPots = await getPots()
    setPots(allPots)
    const allMovementsArr = await Promise.all(allPots.map((p) => getPotMovements(p.id)))
    const allMovements: Record<string, PotMovement[]> = {}
    allPots.forEach((p, i) => {
      allMovements[p.id] = allMovementsArr[i]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
    })
    setMovements(allMovements)
    setLoading(false)
  }, [])

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }
    load()
  }, [load, router])

  useRealtime(['pots', 'pot_movements'], load)

  async function handleMove(pot: Pot, direction: 'in' | 'out') {
    const amt = parseFloat(moveAmount[pot.id] || '')
    if (!amt || amt <= 0) return
    await savePotMovement({
      id: uuidv4(), pot_id: pot.id, amount: amt, direction,
      note: moveNote[pot.id] || undefined,
      created_at: new Date().toISOString(),
    })
    setMoveAmount((prev) => ({ ...prev, [pot.id]: '' }))
    setMoveNote((prev) => ({ ...prev, [pot.id]: '' }))
  }

  async function handleMarkCfoPaid(pot: Pot) {
    await upsertPot({ ...pot, last_paid_at: new Date().toISOString() })
  }

  if (authed === null) return null

  const totalPots = pots.reduce((s, p) => s + p.current_balance, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header streak={0} />
      <main className="pb-24 px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="text-teal-400 animate-spin" /></div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Total across all pots</p>
              <p className="text-2xl font-bold text-teal-700">{formatCurrency(totalPots)}</p>
            </div>

            {pots.map((pot) => {
              const overdue = isCfoRetainerOverdue(pot)
              const daysUntil = pot.id === 'pot-cfo' ? cfoRetainerDaysUntilDue(pot) : null
              const isOpen = expanded === pot.id
              const progress = pot.target_amount ? Math.min(100, (pot.current_balance / pot.target_amount) * 100) : null
              const potMovements = movements[pot.id] || []

              return (
                <div key={pot.id} className={`bg-white rounded-xl border overflow-hidden ${overdue ? 'border-red-300' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : pot.id)}
                    className="w-full px-4 py-4 flex items-start justify-between gap-3 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-base ${overdue ? 'text-red-600' : 'text-slate-800'}`}>{pot.name}</span>
                        {overdue && (
                          <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                        {pot.id === 'pot-cfo' && !overdue && daysUntil !== null && (
                          <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> {daysUntil === 0 ? 'Due today' : `${daysUntil}d`}
                          </span>
                        )}
                      </div>
                      <p className={`text-xl font-bold mt-0.5 ${overdue ? 'text-red-600' : 'text-teal-700'}`}>
                        {formatCurrency(pot.current_balance)}
                        {pot.target_amount && (
                          <span className="text-sm font-normal text-slate-400 ml-1">/ {formatCurrency(pot.target_amount)}</span>
                        )}
                      </p>
                      {progress !== null && (
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${overdue ? 'bg-red-400' : 'bg-teal-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0 mt-1" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                      {pot.id === 'pot-cfo' && (
                        <button
                          onClick={() => handleMarkCfoPaid(pot)}
                          className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition ${
                            overdue ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          <CheckCircle size={16} />
                          {overdue ? 'Mark CFO Retainer as paid' : 'Mark as paid this month'}
                        </button>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add or withdraw</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                          <input type="number" inputMode="decimal" placeholder="Amount"
                            value={moveAmount[pot.id] || ''}
                            onChange={(e) => setMoveAmount((prev) => ({ ...prev, [pot.id]: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                        </div>
                        <input type="text" placeholder="Note (optional)"
                          value={moveNote[pot.id] || ''}
                          onChange={(e) => setMoveNote((prev) => ({ ...prev, [pot.id]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleMove(pot, 'in')}
                            className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-green-100 transition">
                            <Plus size={14} /> Add
                          </button>
                          <button onClick={() => handleMove(pot, 'out')}
                            className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-100 transition">
                            <Minus size={14} /> Withdraw
                          </button>
                        </div>
                      </div>

                      {potMovements.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recent movements</p>
                          <div className="space-y-2">
                            {potMovements.map((m) => (
                              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div>
                                  <p className="text-xs text-slate-500">{formatDate(m.created_at)}</p>
                                  {m.note && <p className="text-xs text-slate-400 italic">{m.note}</p>}
                                </div>
                                <span className={`text-sm font-bold ${m.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                  {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
