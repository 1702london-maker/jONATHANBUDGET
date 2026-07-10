'use client'
import { useState } from 'react'
import { setAuthed } from '@/lib/db'
import { Eye, EyeOff } from 'lucide-react'

const SHARED_PASSWORD = 'jonathan2024'

interface LoginGateProps {
  onLogin: () => void
}

export default function LoginGate({ onLogin }: LoginGateProps) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === SHARED_PASSWORD) {
      setAuthed(true)
      onLogin()
    } else {
      setError('Incorrect password. Please try again.')
      setPw('')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-semibold text-slate-800 mb-2 text-center">
          Jonathan Budgeting
        </h1>
        <p className="text-center text-slate-500 text-sm mb-10">
          Shared access — enter the password to continue
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl text-base transition"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-8">
          Both Jonathan and his adviser use the same login.
        </p>
      </div>
    </div>
  )
}
