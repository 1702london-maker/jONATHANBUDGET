'use client'
import { format } from 'date-fns'
import { Flame, ShieldCheck } from 'lucide-react'
import { getRole } from '@/lib/db'

interface HeaderProps {
  streak: number
}

export default function Header({ streak }: HeaderProps) {
  const month = format(new Date(), 'MMMM yyyy')
  const role = getRole()

  return (
    <header className="bg-white border-b border-slate-200 px-4 pt-safe-top">
      <div className="pt-3 pb-3 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-slate-800 leading-tight">
            Jonathan Budgeting
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-slate-500 font-medium">{month}</span>
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                <Flame size={11} />
                <span>{streak} day streak</span>
              </div>
            )}
          </div>
        </div>
        {role === 'cfo' && (
          <div className="flex items-center gap-1 bg-teal-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold mt-1">
            <ShieldCheck size={12} />
            <span>CFO</span>
          </div>
        )}
      </div>
    </header>
  )
}
