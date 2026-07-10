'use client'
import { Transaction } from '@/lib/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import { Flag, ArrowUpRight, ArrowDownLeft, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'

interface TransactionCardProps {
  tx: Transaction
  onFlag?: (tx: Transaction) => void
  flagNote?: string
}

const METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
}

export default function TransactionCard({ tx, onFlag, flagNote }: TransactionCardProps) {
  const MethodIcon = METHOD_ICONS[tx.method]
  const isOut = tx.direction === 'out'

  return (
    <div className={`bg-white rounded-xl border p-3 ${tx.flagged ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            isOut ? 'bg-red-50' : 'bg-green-50'
          }`}>
            {isOut
              ? <ArrowUpRight size={16} className="text-red-500" />
              : <ArrowDownLeft size={16} className="text-green-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm truncate">
                {tx.counterparty_name || 'Unknown'}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[tx.category]}`}>
                {CATEGORY_LABELS[tx.category]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <MethodIcon size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">{tx.method}</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{tx.business_or_personal}</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{formatDate(tx.created_at)}</span>
            </div>
            {tx.note && (
              <p className="text-xs text-slate-500 mt-1 italic">{tx.note}</p>
            )}
            {flagNote && (
              <p className="text-xs text-red-600 mt-1 font-medium">Flag: {flagNote}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`font-bold text-base ${isOut ? 'text-red-600' : 'text-green-600'}`}>
            {isOut ? '-' : '+'}{formatCurrency(tx.amount)}
          </span>
          {onFlag && (
            <button
              onClick={() => onFlag(tx)}
              className={`p-1 rounded ${tx.flagged ? 'text-red-500' : 'text-slate-300 hover:text-red-400'}`}
              title="Flag this transaction"
            >
              <Flag size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
