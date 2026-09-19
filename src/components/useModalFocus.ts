import { useEffect, useRef } from 'react'

export function useModalFocus(
  isOpen: boolean,
  onClose: () => void,
  canClose = true
) {
  const dialogRef = useRef<HTMLElement>(null)
  const initialFocusRef = useRef<HTMLButtonElement>(null)
  const canCloseRef = useRef(canClose)
  canCloseRef.current = canClose

  useEffect(() => {
    if (!isOpen) return
    const activeElement = document.activeElement as HTMLElement | null
    const fallbackTrigger = document.getElementById('account-menu-trigger')
    const opener = activeElement?.closest('.account-menu__popover')
      ? fallbackTrigger
      : activeElement && activeElement !== document.body
      ? activeElement
      : fallbackTrigger
    const background = document.querySelectorAll<HTMLElement>(
      '.dashboard-header, .dashboard-navigation, .dashboard-content'
    )
    background.forEach(element => {
      element.setAttribute('inert', '')
      element.setAttribute('aria-hidden', 'true')
    })
    initialFocusRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canCloseRef.current) {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      background.forEach(element => {
        element.removeAttribute('inert')
        element.removeAttribute('aria-hidden')
      })
      opener?.focus()
    }
  }, [isOpen, onClose])

  return { dialogRef, initialFocusRef }
}
