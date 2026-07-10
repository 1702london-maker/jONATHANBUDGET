'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Direction, Method, Category, BusinessOrPersonal, QuickChip, Account } from '@/lib/types'
import { saveTransaction, getKnownNames, isAuthed, getAccounts, getSettings } from '@/lib/db'
import { CATEGORY_LABELS, formatCurrency } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { ChevronLeft, CheckCircle, CreditCard, Loader2 } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES: Category[] = [
  'food', 'transport', 'nightlife', 'personal_transfer', 'business', 'subscription', 'other',
]

const QUICK_CHIPS: QuickChip[] = [
  { label: "Mum's Rent", who: "Mum's Rent", category: 'personal_transfer' },
  { label: "Kids' Mum 1", who: "Kids' Mum 1", category: 'personal_transfer' },
  { label: "Kids' Mum 2", who: "Kids' Mum 2", category: 'personal_transfer' },
  { label: 'Mum Upkeep', who: 'Mum Upkeep', category: 'personal_transfer' },
  { label: 'Uber', who: 'Uber', category: 'transport' },
  { label: 'Train Ticket', who: 'Train Ticket', category: 'transport' },
]

export default function LogPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [spendAlert, setSpendAlert] = useState(false)
  const [spendThreshold, setSpendThreshold] = useState(100)

  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<Direction | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [who, setWho] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allNames, setAllNames] = useState<string[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [note, setNote] = useState('')
  const [bop, setBop] = useState<BusinessOrPersonal | null>(null)
  const [cashRecipient, setCashRecipient] = useState('')
  const [isCardPayment, setIsCardPayment] = useState(false)
  const [linkedCardId, setLinkedCardId] = useState('')
  const [creditCards, setCreditCards] = useState<Account[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }
    async function init() {
      const [names, accs, settings] = await Promise.all([getKnownNames(), getAccounts(), getSettings()])
      setAllNames(names)
      setCreditCards(accs.filter((a) => a.type === 'credit'))
      setSpendThreshold(settings.spend_alert_threshold)
    }
    init()
  }, [router])

  function applyChip(chip: QuickChip) {
    setWho(chip.who)
    setCategory(chip.category)
    setSuggestions([])
  }

  function handleWhoChange(val: string) {
    setWho(val)
    if (val.trim().length > 0) {
      setSuggestions(allNames.filter((n) => n.toLowerCase().includes(val.toLowerCase())).slice(0, 5))
    } else {
      setSuggestions([])
    }
  }

  async function handleSubmit() {
    setError('')
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return }
    if (!direction) { setError('Choose Money In or Money Out.'); return }
    if (!method) { setError('Choose a payment method.'); return }
    if (!who.trim()) { setError('Enter a name.'); return }
    if (method === 'cash' && !cashRecipient.trim()) { setError('For cash, enter who gave or received it.'); return }
    if (!category) { setError('Choose a category.'); return }
    if (!bop) { setError('Choose Business or Personal.'); return }
    if (isCardPayment && !linkedCardId) { setError('Select which card this payment is reducing.'); return }

    setSaving(true)
    const isHighValue = direction === 'out' && amt >= spendThreshold

    await saveTransaction({
      id: uuidv4(),
      amount: parseFloat(amt.toFixed(2)),
      direction,
      method,
      counterparty_name: who.trim(),
      category,
      business_or_personal: bop,
      note: note.trim() || undefined,
      is_card_payment: isCardPayment,
      linked_card_id: isCardPayment ? linkedCardId : undefined,
      created_at: new Date().toISOString(),
      flagged: false,
    })

    setSaving(false)
    if (isHighValue) setSpendAlert(true)
    else { setDone(true); setTimeout(() => router.replace('/'), 1000) }
  }

  if (authed === null) return null

  if (spendAlert) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <CheckCircle size={32} className="text-teal-500" />
        </div>
        <p className="font-serif text-2xl text-slate-800 font-semibold">Entry logged</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full max-w-xs">
          <p className="text-amber-800 text-sm font-semibold">Spend alert</p>
          <p className="text-amber-700 text-sm mt-1">
            {formatCurrency(parseFloat(amount))} is above the £{spendThreshold} threshold. Both you and your adviser will see this immediately.
          </p>
        </div>
        <button onClick={() => router.replace('/')} className="text-teal-600 font-semibold text-sm">
          Back to home
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <CheckCircle size={48} className="text-teal-500" />
        <p className="font-serif text-2xl text-slate-800 font-semibold">Logged</p>
      </div>
    )
  }

  const showCardToggle = method === 'card' || method === 'transfer'

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <Link href="/" className="text-slate-500 hover:text-slate-700">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-serif text-xl font-semibold text-slate-800">Log It</h1>
      </div>

      <div className="px-4 py-5 pb-32 space-y-6 max-w-lg mx-auto">

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-medium">£</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-2xl font-bold text-slate-800 outline-none focus:border-teal-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Direction</label>
          <div className="grid grid-cols-2 gap-3">
            {([['out', 'Money Out'], ['in', 'Money In']] as [Direction, string][]).map(([val, label]) => (
              <button
                key={val} onClick={() => setDirection(val)}
                className={`py-4 rounded-2xl font-bold text-base border-2 transition ${
                  direction === val
                    ? val === 'out' ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Method</label>
          <div className="grid grid-cols-3 gap-2">
            {([['cash', 'Cash'], ['card', 'Card'], ['transfer', 'Transfer']] as [Method, string][]).map(([val, label]) => (
              <button
                key={val} onClick={() => { setMethod(val); if (val === 'cash') setIsCardPayment(false) }}
                className={`py-3.5 rounded-xl font-semibold text-sm border-2 transition ${
                  method === val ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === 'cash' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Received from / Given to
            </label>
            <input
              type="text"
              placeholder="Cash must always be logged the same day it's received or spent — this is the one rule that matters most."
              value={cashRecipient}
              onChange={(e) => setCashRecipient(e.target.value)}
              className="w-full bg-transparent text-sm text-amber-900 placeholder-amber-400 outline-none"
            />
          </div>
        )}

        {showCardToggle && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setIsCardPayment(!isCardPayment)}
              className={`w-full flex items-center justify-between px-4 py-3.5 transition ${isCardPayment ? 'bg-teal-50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={18} className={isCardPayment ? 'text-teal-600' : 'text-slate-400'} />
                <span className={`text-sm font-medium ${isCardPayment ? 'text-teal-700' : 'text-slate-600'}`}>
                  This is a payment towards a card
                </span>
              </div>
              <div className={`w-10 h-6 rounded-full transition ${isCardPayment ? 'bg-teal-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${isCardPayment ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
            {isCardPayment && creditCards.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3 bg-teal-50">
                <p className="text-xs text-teal-700 font-semibold mb-2">Which card is this reducing?</p>
                <div className="space-y-2">
                  {creditCards.map((card) => (
                    <button
                      key={card.id} onClick={() => setLinkedCardId(card.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition ${
                        linkedCardId === card.id ? 'border-teal-500 bg-white text-teal-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span>{card.name}</span>
                      <span className="text-xs text-slate-400">Owed: {formatCurrency(card.current_balance)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick select</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label} onClick={() => applyChip(chip)}
                className={`px-3 py-2 rounded-full text-sm font-medium border-2 transition ${
                  who === chip.who && category === chip.category
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Who</label>
          <input
            type="text" placeholder="Name" value={who}
            onChange={(e) => handleWhoChange(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base text-slate-800 outline-none focus:border-teal-500 transition"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s} onClick={() => { setWho(s); setSuggestions([]) }}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 border-b border-slate-100 last:border-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat} onClick={() => setCategory(cat)}
                className={`py-3 rounded-xl font-medium text-sm border-2 transition text-left px-3 ${
                  category === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business or Personal</label>
          <div className="grid grid-cols-2 gap-3">
            {([['business', 'Business'], ['personal', 'Personal']] as [BusinessOrPersonal, string][]).map(([val, label]) => (
              <button
                key={val} onClick={() => setBop(val)}
                className={`py-4 rounded-2xl font-bold text-base border-2 transition ${
                  bop === val ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note (optional)</label>
          <input
            type="text" placeholder="Any extra detail" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base text-slate-800 outline-none focus:border-teal-500 transition"
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 text-white font-bold py-5 rounded-2xl text-lg transition flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={20} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}
