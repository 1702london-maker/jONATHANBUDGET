'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Account } from '@/lib/types'
import { getAccounts, upsertAccount, deleteAccount, isAuthed, isCFO } from '@/lib/db'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, calcNetCurrent, calcNetPosition, calcTotalCreditOwed } from '@/lib/utils'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { Pencil, Check, Plus, Trash2, CreditCard, Banknote, Building2, Info, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const TYPE_ICONS = { current: Building2, credit: CreditCard, cash: Banknote }

export default function AccountsPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [cfo, setCfo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<Account['type']>('current')
  const [newBalance, setNewBalance] = useState('')

  const load = useCallback(async () => {
    setAccounts(await getAccounts())
    setLoading(false)
  }, [])

  useEffect(() => {
    const ok = isAuthed()
    setAuthed(ok)
    if (!ok) { router.replace('/'); return }
    setCfo(isCFO())
    load()
  }, [load, router])

  useRealtime(['accounts'], load)

  async function saveEdit(acc: Account) {
    const bal = parseFloat(editBalance)
    if (isNaN(bal)) return
    await upsertAccount({ ...acc, current_balance: bal, last_updated_at: new Date().toISOString() })
    setEditId(null)
    load()
  }

  async function handleAdd() {
    if (!newName.trim()) return
    await upsertAccount({
      id: uuidv4(), name: newName.trim(), type: newType,
      current_balance: parseFloat(newBalance) || 0,
      baseline_balance: parseFloat(newBalance) || 0,
      last_updated_at: new Date().toISOString(),
    })
    setNewName(''); setNewBalance(''); setNewType('current'); setAddOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    await deleteAccount(id)
    load()
  }

  const netCurrent = calcNetCurrent(accounts)
  const netPosition = calcNetPosition(accounts)
  const creditOwed = calcTotalCreditOwed(accounts)
  const currentAccounts = accounts.filter((a) => a.type === 'current' || a.type === 'cash')
  const creditAccounts = accounts.filter((a) => a.type === 'credit')

  if (authed === null) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header streak={0} />
      <main className="pb-24 px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="text-teal-400 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Net Current</p>
                <p className={`text-xl font-bold ${netCurrent >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{formatCurrency(netCurrent)}</p>
                <p className="text-xs text-slate-400 mt-1">Before debts</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Net Position</p>
                <p className={`text-xl font-bold ${netPosition >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{formatCurrency(netPosition)}</p>
                <p className="text-xs text-slate-400 mt-1">After all cards</p>
              </div>
            </div>

            {creditOwed > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 items-start">
                <Info size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  <span className="font-semibold">{formatCurrency(creditOwed)}</span> outstanding across credit cards. Log a card payment in{' '}
                  <Link href="/log" className="underline">Log It</Link> using the card payment toggle and the balance will reduce automatically.
                </p>
              </div>
            )}

            {currentAccounts.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 px-1">Current accounts and cash</p>
                <div className="space-y-3">
                  {currentAccounts.map((acc) => (
                    <AccountCard key={acc.id} acc={acc} editId={editId} editBalance={editBalance} cfo={cfo}
                      onEdit={(a) => { setEditId(a.id); setEditBalance(a.current_balance.toString()) }}
                      onSave={saveEdit} onDelete={handleDelete} onChangeBalance={setEditBalance} />
                  ))}
                </div>
              </div>
            )}

            {creditAccounts.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 px-1">Credit cards — amount owed</p>
                <div className="space-y-3">
                  {creditAccounts.map((acc) => (
                    <AccountCard key={acc.id} acc={acc} editId={editId} editBalance={editBalance} cfo={cfo}
                      onEdit={(a) => { setEditId(a.id); setEditBalance(a.current_balance.toString()) }}
                      onSave={saveEdit} onDelete={handleDelete} onChangeBalance={setEditBalance} />
                  ))}
                </div>
              </div>
            )}

            {cfo && addOpen ? (
              <div className="bg-white rounded-xl border border-teal-200 p-4 space-y-3">
                <h2 className="font-serif text-lg font-semibold text-slate-800">Add account</h2>
                <input type="text" placeholder="Account name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                <div className="grid grid-cols-3 gap-2">
                  {(['current', 'credit', 'cash'] as Account['type'][]).map((t) => (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 capitalize transition ${newType === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                  <input type="number" inputMode="decimal" placeholder="Starting balance" value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="flex-1 bg-teal-600 text-white font-semibold py-2.5 rounded-xl text-sm">Add</button>
                  <button onClick={() => setAddOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            ) : cfo ? (
              <button onClick={() => setAddOpen(true)}
                className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 hover:border-teal-300 hover:text-teal-600 transition">
                <Plus size={18} />
                <span className="font-medium text-sm">Add account</span>
              </button>
            ) : null}

            <Link href="/month-review"
              className="flex items-center justify-center w-full border border-slate-200 rounded-xl py-3 text-sm text-slate-500 font-medium hover:border-teal-300 hover:text-teal-600 transition bg-white">
              Month-end reconciliation
            </Link>

            {cfo && (
              <Link href="/setup"
                className="flex items-center justify-center w-full border border-teal-200 rounded-xl py-3 text-sm text-teal-600 font-medium hover:bg-teal-50 transition bg-white">
                Edit baseline balances
              </Link>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

function AccountCard({ acc, editId, editBalance, cfo, onEdit, onSave, onDelete, onChangeBalance }: {
  acc: Account; editId: string | null; editBalance: string; cfo: boolean
  onEdit: (a: Account) => void; onSave: (a: Account) => void
  onDelete: (id: string) => void; onChangeBalance: (v: string) => void
}) {
  const Icon = TYPE_ICONS[acc.type]
  const isEditing = editId === acc.id
  const isDebt = acc.type === 'credit' && acc.current_balance > 0
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
            <Icon size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{acc.name}</p>
            <p className="text-xs text-slate-400 capitalize">{acc.type} account</p>
          </div>
        </div>
        {cfo && (
          <div className="flex items-center gap-2">
            {isEditing
              ? <button onClick={() => onSave(acc)} className="text-teal-600"><Check size={18} /></button>
              : <button onClick={() => onEdit(acc)} className="text-slate-400 hover:text-slate-600"><Pencil size={16} /></button>}
            <button onClick={() => onDelete(acc.id)} className="text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
      <div className="mt-3">
        {isEditing ? (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
            <input type="number" inputMode="decimal" value={editBalance} onChange={(e) => onChangeBalance(e.target.value)}
              className="w-full border-2 border-teal-400 rounded-xl pl-8 pr-3 py-2 text-lg font-bold text-slate-800 outline-none" autoFocus />
          </div>
        ) : (
          <p className={`text-2xl font-bold ${isDebt ? 'text-red-600' : 'text-slate-800'}`}>
            {isDebt && '-'}{formatCurrency(acc.current_balance)}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Updated {formatDistanceToNow(new Date(acc.last_updated_at))} ago</p>
      </div>
    </div>
  )
}
