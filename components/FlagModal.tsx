'use client'
import { useState } from 'react'
import { Transaction } from '@/lib/types'
import { Flag as FlagType } from '@/lib/types'
import { saveFlag, updateFlag } from '@/lib/db'
import { X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface FlagModalProps {
  tx: Transaction
  existingFlag?: FlagType
  onClose: () => void
}

export default function FlagModal({ tx, existingFlag, onClose }: FlagModalProps) {
  const [note, setNote] = useState(existingFlag?.note || '')
  const [resolveNote, setResolveNote] = useState('')
  const [view, setView] = useState<'flag' | 'resolve'>(
    existingFlag && !existingFlag.resolved ? 'resolve' : 'flag'
  )

  async function handleFlag() {
    if (!note.trim()) return
    if (existingFlag) {
      await updateFlag({ ...existingFlag, note })
    } else {
      await saveFlag({
        id: uuidv4(),
        transaction_id: tx.id,
        note,
        created_at: new Date().toISOString(),
        resolved: false,
      })
    }
    onClose()
  }

  async function handleResolve() {
    if (!existingFlag) return
    await updateFlag({ ...existingFlag, resolved: true, resolution_note: resolveNote })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-6 max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-slate-800">
            {view === 'resolve' ? 'Resolve flag' : 'Flag this entry'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          {tx.counterparty_name} — £{tx.amount.toFixed(2)} ({tx.method})
        </p>

        {view === 'flag' && (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this flagged?"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <button
              onClick={handleFlag}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl mt-3 transition"
            >
              Raise flag
            </button>
          </>
        )}

        {view === 'resolve' && existingFlag && (
          <>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 font-medium">Flag note</p>
              <p className="text-sm text-red-800 mt-1">{existingFlag.note}</p>
            </div>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Resolution note (optional)"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <button
              onClick={handleResolve}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl mt-3 transition"
            >
              Mark as discussed and resolved
            </button>
          </>
        )}
      </div>
    </div>
  )
}
