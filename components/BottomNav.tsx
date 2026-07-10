'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, List, CreditCard, Flag, PiggyBank, LogOut } from 'lucide-react'
import { setAuthed } from '@/lib/db'

const tabs = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/history', label: 'History', Icon: List },
  { href: '/pots', label: 'Pots', Icon: PiggyBank },
  { href: '/accounts', label: 'Accounts', Icon: CreditCard },
  { href: '/flags', label: 'Flags', Icon: Flag },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    setAuthed(false)
    router.replace('/')
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  )
}
