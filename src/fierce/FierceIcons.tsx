// Shared SVG icon set used across the fierce UI.
// Stroke icons inherit currentColor; size via width/height props.

import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const Stroke = ({ children, ...rest }: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
)

export const IconHome = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 12l9-9 9 9" />
    <path d="M5 10v10h14V10" />
  </Stroke>
)

export const IconChecklist = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 11l3 3 8-8" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Stroke>
)

export const IconBag = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 7h18l-2 12H5z" />
    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
  </Stroke>
)

export const IconCart = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M3 4h2l3 12h12l2-8H6" />
  </Stroke>
)

export const IconBell = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Stroke>
)

export const IconBolt = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </Stroke>
)

export const IconPlus = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
)

export const IconArrowRight = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
)

export const IconRefresh = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v6h-6" />
  </Stroke>
)

export const IconClose = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
)

export const IconCheck = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 12l5 5 9-9" />
  </Stroke>
)

export const IconBack = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Stroke>
)

export const IconSun = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </Stroke>
)

export const IconMoon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Stroke>
)

export const IconReticle = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
  </Stroke>
)

export const IconEdit = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M11 4H4v16h16v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
  </Stroke>
)

export const IconTrash = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Stroke>
)

export const IconStar = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z" />
  </Stroke>
)

export const IconShield = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </Stroke>
)

export const IconAI = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
  </Stroke>
)

// Sparkle (filled — not a stroke)
export const IconSparkle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2 L13.5 9 L21 10 L13.5 11.5 L12 18.5 L10.5 11.5 L3 10 L10.5 9 Z" />
  </svg>
)

// Diamond shard (filled gradient)
export const IconShard = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...p}>
    <defs>
      <linearGradient id="fierce-shard-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff3030" />
        <stop offset="50%" stopColor="#ff7a18" />
        <stop offset="100%" stopColor="#facc15" />
      </linearGradient>
    </defs>
    <path d="M12 2 L20 12 L12 22 L4 12 Z" fill="url(#fierce-shard-grad)" />
    <path d="M12 2 L20 12 L12 12 Z" fill="rgba(255,255,255,0.25)" />
  </svg>
)

// Flame for streaks
export const IconFlame = ({ variant = 'warm', ...p }: IconProps & { variant?: 'warm' | 'cool' | 'violet' }) => {
  const id = `fierce-flame-${variant}`
  const stops = {
    warm: [['#f97316', '0%'], ['#fb923c', '55%'], ['#fde047', '100%']],
    cool: [['#0ea5e9', '0%'], ['#22d3ee', '60%'], ['#a5f3fc', '100%']],
    violet: [['#7c3aed', '0%'], ['#a78bfa', '60%'], ['#fbcfe8', '100%']],
  }[variant]
  return (
    <svg viewBox="0 0 24 28" {...p}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          {stops.map(([color, offset], i) => (
            <stop key={i} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d="M12 1 C13 6 18 8 18 14 a6 6 0 0 1 -12 0 C6 11 8 9 9 7 c1 2 2 3 3 3 c0 -3 -1 -6 0 -9z"
        fill={`url(#${id})`}
      />
      <path
        d="M12 14 c1 2 3 3 3 6 a3 3 0 0 1 -6 0 c0 -1 1 -2 2 -3 c0 1 1 1 1 1 c0 -1 0 -3 0 -4z"
        fill="rgba(255,255,255,0.5)"
      />
    </svg>
  )
}
