import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import SystemIcon from './SystemIcon'

interface AccountMenuProps {
  name: string
  username: string
  onFeedback: () => void
  onReplayTour: () => void
  onLogout: () => void
}

const AccountMenu: React.FC<AccountMenuProps> = ({
  name,
  username,
  onFeedback,
  onReplayTour,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const runAndClose = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        id="account-menu-trigger"
        className="account-menu__trigger"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        data-tour="theme-toggle"
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {(name || username).slice(0, 1).toUpperCase()}
        </span>
        <span className="account-menu__name">{name || username}</span>
        <SystemIcon name="chevron" size={15} />
      </button>

      {isOpen && (
        <div className="account-menu__popover" role="menu" aria-label="Account and preferences">
          <div className="account-menu__identity">
            <span className="account-menu__avatar" aria-hidden="true">
              {(name || username).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{name || username}</strong>
              <span>@{username}</span>
            </div>
          </div>
          <div className="account-menu__divider" />
          <button type="button" role="menuitem" onClick={() => runAndClose(toggleTheme)}>
            <SystemIcon name="appearance" />
            <span>
              <strong>Appearance</strong>
              <small>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => runAndClose(onFeedback)}>
            <SystemIcon name="feedback" />
            <span>
              <strong>Send feedback</strong>
              <small>Report a bug or suggest an improvement</small>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            aria-label="Replay the onboarding tour"
            onClick={() => runAndClose(onReplayTour)}
          >
            <SystemIcon name="tour" />
            <span>
              <strong>Replay guide</strong>
              <small>Review how each part of Gamif.AI works</small>
            </span>
          </button>
          <div className="account-menu__divider" />
          <button
            type="button"
            className="account-menu__logout"
            role="menuitem"
            onClick={() => runAndClose(onLogout)}
          >
            <SystemIcon name="logout" />
            <span>
              <strong>Log out</strong>
              <small>End this session safely</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
