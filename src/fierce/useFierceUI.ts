// Feature flag for the v4 "fierce" UI redesign.
// Sources, in order of priority:
//   1. URL query param ?fierce=1 / ?fierce=0   (persisted to localStorage)
//   2. localStorage('gamifai-fierce-ui')
//   3. VITE_FIERCE_UI build env (default off)
//
// Toggle at runtime from the console:
//   localStorage.setItem('gamifai-fierce-ui', '1'); location.reload()
//   localStorage.removeItem('gamifai-fierce-ui'); location.reload()

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'gamifai-fierce-ui'

function readFlagOnce(): boolean {
  try {
    const url = new URL(window.location.href)
    const q = url.searchParams.get('fierce')
    if (q === '1' || q === 'true') {
      try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
      return true
    }
    if (q === '0' || q === 'false') {
      try { localStorage.setItem(STORAGE_KEY, '0') } catch { /* noop */ }
      return false
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === '1' || stored === 'true') return true
    if (stored === '0' || stored === 'false') return false
  } catch { /* SSR / privacy mode */ }

  // Vite-injected build flag
  const envFlag = (import.meta as any).env?.VITE_FIERCE_UI
  return envFlag === '1' || envFlag === 'true'
}

export function useFierceUI(): boolean {
  const [enabled, setEnabled] = useState<boolean>(readFlagOnce)

  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute('data-ui', 'fierce')
      // Fierce theme defaults to dark — feels strongest there.
      const existingTheme = document.documentElement.getAttribute('data-theme')
      if (!existingTheme) {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    } else {
      document.documentElement.removeAttribute('data-ui')
    }
  }, [enabled])

  // Allow runtime toggling via a global helper, useful in DevTools.
  useEffect(() => {
    ;(window as any).toggleFierceUI = (next?: boolean) => {
      const value = typeof next === 'boolean' ? next : !enabled
      try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0') } catch { /* noop */ }
      setEnabled(value)
    }
  }, [enabled])

  return enabled
}
