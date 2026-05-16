import { useTheme } from '../contexts/ThemeContext'
import { IconSun, IconMoon } from './FierceIcons'

export default function FierceThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      className="fierce-theme-fab"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
      <span className="fierce-theme-fab__label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  )
}
