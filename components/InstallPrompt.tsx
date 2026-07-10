'use client'
import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return
    // Don't show if user dismissed before
    if (localStorage.getItem('pwa_dismissed') === 'true') return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      setShowBanner(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa_dismissed', 'true')
    setShowBanner(false)
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setDeferredPrompt(null)
  }

  if (!showBanner || dismissed) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 bg-white border border-teal-200 rounded-2xl shadow-lg p-4 flex items-start gap-3"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-serif font-bold text-sm">JB</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">Install Jonathan Budgeting</p>
        {isIOS ? (
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
            Tap <Share size={12} className="inline text-teal-600 flex-shrink-0" /> then
            <span className="font-medium text-slate-700">Add to Home Screen</span>
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5">
            Install for instant access on your home screen
          </p>
        )}
        {!isIOS && (
          <button
            onClick={install}
            className="mt-2 flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            <Download size={12} />
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
        <X size={18} />
      </button>
    </div>
  )
}
