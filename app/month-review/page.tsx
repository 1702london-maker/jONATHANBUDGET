'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthed, getTransactions, getMonthReviews, upsertMonthReview } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { CheckCircle, AlertTriangle, ChevronLeft, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'
import { MonthReview } from '@/lib/types'

export default function MonthReviewPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggedOut, setLoggedOut] = useState(0)
  const [loggedIn, setLoggedIn] = useState(0)
  const [actualBalanceChange, setActualBalanceChange] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [existing, setExisting] = useState<MonthReview | null>(null)

  const currentMonth = format(new Date(), 'yyyy-MM')
  const monthLabel = format(new Date(), 'MMMM yyyy')

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }

    async function init() {
      const [txs, reviews] = await Promise.all([getTransactions(), getMonthReviews()])
      const start = startOfMonth(new Date())
      const end = endOfMonth(new Date())
      const thisMonthTxs = txs.filter((t) => isWithinInterval(parseISO(t.created_at), { start, end }))
      setLoggedOut(thisMonthTxs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0))
      setLoggedIn(thisMonthTxs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0))
      const ex = reviews.find((r) => r.month === currentMonth)
      if (ex) setExisting(ex)
      setLoading(false)
    }
    init()
  }, [router, currentMonth])

  async function handleSave() {
    setSaving(true)
    const actual = parseFloat(actualBalanceChange) || 0
    const tolerance = 5
    const diff = Math.abs(loggedOut - actual)
    const matched = diff <= tolerance

    await upsertMonthReview({
      id: existing?.id || uuidv4(),
      month: currentMonth,
      logged_total_out: loggedOut,
      logged_total_in: loggedIn,
      balance_change_total: actual,
      matched,
      discrepancy_note: !matched ? discrepancyNote : undefined,
      reviewed_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(true)
  }

  if (authed === null) return null

  const actual = parseFloat(actualBalanceChange) || 0
  const diff = loggedOut - actual
  const diffAbs = Math.abs(diff)
  const tolerance = 5
  const wouldMatch = diffAbs <= tolerance

  if (saved) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <CheckCircle size={48} className="text-teal-500" />
        <p className="font-serif text-2xl text-slate-800 font-semibold">{monthLabel} reviewed</p>
        <p className="text-slate-400 text-sm">The month has been marked as reviewed and locked.</p>
        <Link href="/" className="text-teal-600 font-semibold text-sm mt-2">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <Link href="/" className="text-slate-500 hover:text-slate-700"><ChevronLeft size={24} /></Link>
        <h1 className="font-serif text-xl font-semibold text-slate-800">Month-end review</h1>
      </div>

      <div className="px-4 py-5 pb-32 max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Month</p>
          <p className="font-serif text-2xl font-semibold text-slate-800">{monthLabel}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="text-teal-400 animate-spin" /></div>
        ) : (
          <>
            {existing?.reviewed_at && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3">
                <CheckCircle size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-teal-700 font-semibold text-sm">Already reviewed</p>
                  <p className="text-teal-600 text-xs mt-0.5">
                    Reviewed {format(parseISO(existing.reviewed_at), 'd MMM yyyy')}. You can still update and re-save.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">What the app recorded this month</p>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total logged out</span>
                <span className="font-bold text-red-600">{formatCurrency(loggedOut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total logged in</span>
                <span className="font-bold text-green-600">{formatCurrency(loggedIn)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-sm font-semibold text-slate-700">Net logged</span>
                <span className={`font-bold ${loggedIn - loggedOut >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                  {formatCurrency(loggedIn - loggedOut)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Actual total spent — from your bank statements and card statements
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Open each banking app, add up everything that left your accounts this month, and enter the total here.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-medium">£</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={actualBalanceChange}
                  onChange={(e) => setActualBalanceChange(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-2xl font-bold text-slate-800 outline-none focus:border-teal-500 transition" />
              </div>
            </div>

            {actualBalanceChange !== '' && (
              <div className={`rounded-xl border p-4 ${wouldMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {wouldMatch
                    ? <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    {wouldMatch ? (
                      <p className="text-green-700 font-semibold text-sm">Figures match — within £{tolerance} tolerance</p>
                    ) : (
                      <>
                        <p className="text-red-700 font-semibold text-sm">Mismatch of {formatCurrency(diffAbs)}</p>
                        <p className="text-red-600 text-xs mt-1">
                          The app logged {formatCurrency(loggedOut)} out, but statements show {formatCurrency(actual)}.{' '}
                          {diff > 0 ? 'Something may be missing from the log.' : 'The app has logged more than the statements show.'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {actualBalanceChange !== '' && !wouldMatch && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Explain the discrepancy before marking reviewed
                </label>
                <textarea
                  placeholder="What explains the difference? Missing entries, refunds, transfers not counted..."
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 resize-none h-24 transition"
                />
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !actualBalanceChange || (!wouldMatch && !discrepancyNote.trim())}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-5 rounded-2xl text-lg transition flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={20} className="animate-spin" />}
              {saving ? 'Saving...' : `Mark ${monthLabel} as reviewed`}
            </button>

            {!wouldMatch && !discrepancyNote.trim() && actualBalanceChange !== '' && (
              <p className="text-center text-xs text-slate-400">
                Add a note explaining the discrepancy before marking this month as reviewed.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
