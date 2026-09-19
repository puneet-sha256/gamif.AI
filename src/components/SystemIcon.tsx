interface SystemIconProps {
  name:
    | 'profile'
    | 'tasks'
    | 'inventory'
    | 'shop'
    | 'journey'
    | 'guild'
    | 'rewards'
    | 'notifications'
    | 'feedback'
    | 'chevron'
    | 'appearance'
    | 'tour'
    | 'logout'
  size?: number
}

const SystemIcon: React.FC<SystemIconProps> = ({ name, size = 20 }) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (name) {
    case 'profile':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.75 19.25c.55-3.25 2.66-5.25 6.25-5.25s5.7 2 6.25 5.25" />
        </svg>
      )
    case 'tasks':
      return (
        <svg {...commonProps}>
          <rect x="5" y="4.5" width="14" height="15" rx="2" />
          <path d="m8 9 1.2 1.2L11.5 8M13.5 9h2.5M8 14l1.2 1.2 2.3-2.2M13.5 14h2.5" />
        </svg>
      )
    case 'inventory':
      return (
        <svg {...commonProps}>
          <path d="M8 8V6.75A4 4 0 0 1 12 3a4 4 0 0 1 4 3.75V8" />
          <path d="M6.25 8h11.5l1 11.5H5.25L6.25 8Z" />
          <path d="M9 12.25h6M9 15.5h6" />
        </svg>
      )
    case 'shop':
      return (
        <svg {...commonProps}>
          <path d="M4.5 8.25h15l-1 11.25h-13l-1-11.25Z" />
          <path d="M8.25 9V6.75A3.75 3.75 0 0 1 12 3a3.75 3.75 0 0 1 3.75 3.75V9" />
          <path d="M8 13h8" />
        </svg>
      )
    case 'journey':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="m14.75 9.25-1.6 3.9-3.9 1.6 1.6-3.9 3.9-1.6Z" />
          <path d="M12 3.75V5.5M12 18.5v1.75M3.75 12H5.5M18.5 12h1.75" />
        </svg>
      )
    case 'guild':
      return (
        <svg {...commonProps}>
          <path d="M12 3.25 18.5 6v5.2c0 4.2-2.45 7.35-6.5 9.55-4.05-2.2-6.5-5.35-6.5-9.55V6L12 3.25Z" />
          <circle cx="12" cy="9.25" r="2" />
          <path d="M8.75 15c.4-1.85 1.48-2.75 3.25-2.75s2.85.9 3.25 2.75" />
        </svg>
      )
    case 'rewards':
      return (
        <svg {...commonProps}>
          <path d="M4.5 10h15v10h-15zM3.5 7h17v3h-17zM12 7v13" />
          <path d="M12 7H8.75A2.25 2.25 0 1 1 11 4.75L12 7Zm0 0h3.25A2.25 2.25 0 1 0 13 4.75L12 7Z" />
        </svg>
      )
    case 'notifications':
      return (
        <svg {...commonProps}>
          <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 5 2 5.25 2 6.5h-15c0-1.25 2-1.5 2-6.5Z" />
          <path d="M9.75 19a2.5 2.5 0 0 0 4.5 0" />
        </svg>
      )
    case 'feedback':
      return (
        <svg {...commonProps}>
          <path d="M4 5.25h16v11.5H9l-5 3v-14.5Z" />
          <path d="M8 9h8M8 12.75h5" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...commonProps}>
          <path d="m8.5 10 3.5 3.5 3.5-3.5" />
        </svg>
      )
    case 'appearance':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.65 5.65l1.4 1.4M16.95 16.95l1.4 1.4M18.35 5.65l-1.4 1.4M7.05 16.95l-1.4 1.4" />
        </svg>
      )
    case 'tour':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="m15.25 8.75-2 4.5-4.5 2 2-4.5 4.5-2Z" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...commonProps}>
          <path d="M10 5H5.5v14H10M14 8l4 4-4 4M18 12H9" />
        </svg>
      )
  }
}

export default SystemIcon
