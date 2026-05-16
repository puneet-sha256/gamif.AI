import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { calculateLevelProgress } from '../utils/levelCalculation'
import {
  calculateStreakMultiplier,
  formatMultiplier,
  calculateStreaksFromHistory,
  calculateDisplayStreaks,
} from '../utils/streakCalculation'
import { IconReticle, IconBolt, IconShard, IconFlame } from './FierceIcons'
import { formatShards } from './formatShards'

interface Props {
  onLogActivityClick?: () => void
  onRegenerate?: () => void
}

// Ember-coloured ring chart with draw-on animation
function FierceRing({
  total,
  strength,
  intelligence,
  charisma,
  size = 168,
}: {
  total: number
  strength: number
  intelligence: number
  charisma: number
  size?: number
}) {
  const r = size / 2 - 14
  const strokeWidth = 14
  const c = r * 2 * Math.PI
  const safeTotal = Math.max(total, 1)
  const sLen = (strength / safeTotal) * c
  const iLen = (intelligence / safeTotal) * c
  const cLen = (charisma / safeTotal) * c

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="fierce-ring-strength" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ff5e2e" />
          </linearGradient>
          <linearGradient id="fierce-ring-intel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="fierce-ring-charisma" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        {total > 0 && (
          <>
            <circle
              className="fierce-ring-seg"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#fierce-ring-strength)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${sLen} ${c}`}
              strokeDashoffset={0}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
              style={{ ['--ring-len' as any]: c, ['--ring-end' as any]: c - sLen }}
            />
            <circle
              className="fierce-ring-seg"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#fierce-ring-intel)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${iLen} ${c}`}
              strokeDashoffset={-sLen}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
              style={{ ['--ring-len' as any]: c, ['--ring-end' as any]: c - iLen, animationDelay: '0.18s' }}
            />
            <circle
              className="fierce-ring-seg"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#fierce-ring-charisma)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${cLen} ${c}`}
              strokeDashoffset={-(sLen + iLen)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
              style={{ ['--ring-len' as any]: c, ['--ring-end' as any]: c - cLen, animationDelay: '0.36s' }}
            />
          </>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: '-0.025em' }}>
          {total.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 2,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Total XP
        </div>
      </div>
    </div>
  )
}

// Compact 16-week heatmap from activity data
function FierceHeatmap({ activityHistory, onCellClick }: { activityHistory?: any; onCellClick?: (date: string) => void }) {
  const { cols, hasAnyActivity } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()
    const sundayThisWeek = new Date(today)
    sundayThisWeek.setDate(sundayThisWeek.getDate() - dayOfWeek)

    // 16 columns ending with the current week — start 15 weeks back from this week's Sunday.
    const start = new Date(sundayThisWeek)
    start.setDate(start.getDate() - 15 * 7)

    const map = new Map<string, number>()
    if (activityHistory?.dailyActivities) {
      activityHistory.dailyActivities.forEach((d: any) => {
        map.set(d.date, d.total || 0)
      })
    }
    const max = Math.max(1, ...Array.from(map.values()))
    const hasAnyActivity = max > 1 || (activityHistory?.dailyActivities?.length ?? 0) > 0

    const cols: { date: string; level: number }[][] = []
    for (let w = 0; w < 16; w++) {
      const col: { date: string; level: number }[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(date.getDate() + w * 7 + d)
        if (date > today) {
          col.push({ date: '', level: -1 })
          continue
        }
        const iso = date.toISOString().split('T')[0]
        const val = map.get(iso) || 0
        let level = 0
        if (val > 0) {
          const p = val / max
          if (p > 0.66) level = 4
          else if (p > 0.33) level = 3
          else if (p > 0.10) level = 2
          else level = 1
        }
        col.push({ date: iso, level })
      }
      cols.push(col)
    }
    return { cols, hasAnyActivity }
  }, [activityHistory])

  if (!hasAnyActivity) {
    return (
      <div
        style={{
          padding: '24px 4px',
          textAlign: 'center',
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="fierce-eyebrow fierce-eyebrow--accent" style={{ marginBottom: 6 }}>NO ACTIVITY YET</div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto' }}>
          Log a debrief and the heatmap starts filling in. One ember square per active day.
        </p>
      </div>
    )
  }

  return (
    <div className="fierce-heatmap" role="grid" aria-label="Activity heatmap last 16 weeks">
      {cols.map((col, ci) => (
        <div className="fierce-heatmap__col" key={ci}>
          {col.map((cell, ri) => (
            <div
              key={ri}
              className={`fierce-heatmap__cell${cell.level > 0 ? ` fierce-heatmap__cell--l${cell.level}` : ''}`}
              style={cell.level === -1 ? { visibility: 'hidden' } : undefined}
              onClick={() => cell.date && onCellClick?.(cell.date)}
              role="gridcell"
              aria-label={cell.date ? `${cell.date}: ${cell.level} of 4` : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function FierceOverview({ onLogActivityClick, onRegenerate }: Props) {
  const { user } = useAuth()

  const totalXP = user?.stats?.experience || 0
  const strength = user?.stats?.strength || 0
  const intelligence = user?.stats?.intelligence || 0
  const charisma = user?.stats?.charisma || 0
  const shards = user?.stats?.shards || 0
  const level = calculateLevelProgress(totalXP)

  const today = new Date().toISOString().split('T')[0]
  const displayStreaks = calculateDisplayStreaks(user?.activityHistory?.dailyActivities || [], today)
  const multiplierStreaks = calculateStreaksFromHistory(user?.activityHistory, today)

  const streaks = [
    {
      key: 'strength',
      label: 'Strength',
      days: displayStreaks.strengthStreak,
      mult: calculateStreakMultiplier(multiplierStreaks.strengthStreak),
      flame: 'warm' as const,
    },
    {
      key: 'intel',
      label: 'Intelligence',
      days: displayStreaks.intelligenceStreak,
      mult: calculateStreakMultiplier(multiplierStreaks.intelligenceStreak),
      flame: 'cool' as const,
    },
    {
      key: 'charisma',
      label: 'Charisma',
      days: displayStreaks.charismaStreak,
      mult: calculateStreakMultiplier(multiplierStreaks.charismaStreak),
      flame: 'violet' as const,
    },
  ]

  const xpToNext = level.needed - level.current
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Late night'
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Late night'
  })()

  // Tier — based on level
  const tierLabel = level.actualLevel >= 30 ? 'S — Sovereign'
    : level.actualLevel >= 20 ? 'A — Ardent'
    : level.actualLevel >= 10 ? 'B — Bold'
    : 'C — Climber'
  const tierLetter = tierLabel.charAt(0)

  // Date string for hero
  const todayDate = new Date()
  const dateString = todayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  const totalMissions = (() => {
    const t = user?.generatedTasks
    if (!t) return 0
    return (t.Strength?.length || 0) + (t.Intelligence?.length || 0) + (t.Charisma?.length || 0)
  })()

  const userName = user?.profileData?.name || 'Athlete'
  const earnedToday = user?.unclaimedRewards?.totalXP || 0

  // Days since the user joined (uses createdAt). Falls back to 1 if unknown.
  const daysOnTheGrind = (() => {
    const created = (user as any)?.createdAt
    if (!created) return 1
    const ms = Date.now() - new Date(created).getTime()
    return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1)
  })()

  return (
    <div className="fierce-shell" style={{ paddingTop: 24, paddingBottom: 24 }}>
      {/* HERO */}
      <section className="fierce-hero">
        <div className="fierce-hero__hud" />
        <div className="fierce-hero__scanlines" />
        <div className="fierce-hero__sheen" />
        {/* Reticle: anchored to the bottom-right corner of the hero, behind content,
            never overlaps the date eyebrow. Strong opacity drop so it reads as ambient. */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          zIndex: 0,
          opacity: 0.32,
          pointerEvents: 'none',
        }}>
          <IconReticle className="fierce-reticle" />
        </div>
        <div className="fierce-hero__inner">
          <div className="fierce-row fierce-row--between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <span className="fierce-tier">
              <span className="fierce-tier__hex">{tierLetter}</span>
              Tier — {tierLabel.split(' — ')[1]}
            </span>
            <span className="fierce-eyebrow" style={{ color: 'rgba(248,248,248,0.55)', whiteSpace: 'nowrap' }}>{dateString}</span>
          </div>

          <p className="fierce-eyebrow fierce-eyebrow--accent" style={{ marginTop: 4 }}>DAY {daysOnTheGrind.toLocaleString()} OF THE GRIND</p>

          <svg className="fierce-waveform" viewBox="0 0 600 36" preserveAspectRatio="none" style={{ marginTop: 8, marginBottom: 4 }}>
            <path d="M0 18 L80 18 L96 18 L104 6 L116 30 L128 18 L210 18 L226 18 L236 4 L246 32 L258 18 L380 18 L392 18 L404 9 L414 27 L424 18 L600 18" />
          </svg>
          <h1 className="fierce-hero__title">
            {greeting}, {userName}.<br />
            <span className="fierce-ember-text">NOW EARN IT.</span>
          </h1>
          <p className="fierce-hero__sub">
            <strong style={{ color: '#fff' }}>{xpToNext.toLocaleString()} XP</strong> from level {level.actualLevel + 1}.{' '}
            <strong className="fierce-ember-pulse" style={{ color: '#fff' }}>No off days.</strong>
          </p>

          <div className="fierce-row fierce-gap-4 fierce-mt-4 fierce-row--wrap" style={{ alignItems: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              <div className="fierce-eyebrow" style={{ color: 'rgba(248,248,248,0.55)', marginBottom: 8 }}>
                PROGRESS TO LEVEL {level.actualLevel + 1}
              </div>
              <div className="fierce-row fierce-gap-3" style={{ alignItems: 'center' }}>
                <span style={{ fontFamily: "'Inter Tight'", fontSize: 28, fontWeight: 800, color: '#fff' }}>
                  {Math.round(level.percentage)}
                  <span style={{ fontSize: 18, color: 'rgba(248,248,248,0.55)' }}>%</span>
                </span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="fierce-hud-bar">
                    <div className="fierce-hud-bar__fill" style={{ width: `${level.percentage}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(248,248,248,0.55)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {level.current.toLocaleString()} / {level.needed.toLocaleString()} XP
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="fierce-btn fierce-btn--ghost"
                onClick={onRegenerate}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', borderColor: 'rgba(255,255,255,0.14)' }}
              >
                <IconBolt /> Regenerate plan
              </button>
              <button className="fierce-btn fierce-btn--fierce" onClick={onLogActivityClick}>
                <IconBolt /> Log activity
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TOP STATS */}
      <section className="fierce-grid fierce-grid--3 fierce-mt-4">
        <div className="fierce-stat-cell fierce-tilt">
          <div className="fierce-stat-cell__lbl">ACTIVE MISSIONS</div>
          <div className="fierce-stat-cell__val">{totalMissions.toLocaleString()}</div>
          <div className="fierce-stat-cell__sub">Push every one through. <span style={{ color: 'var(--accent)', fontWeight: 700 }}>No off days.</span></div>
        </div>
        <div className="fierce-stat-cell fierce-stat-cell--cyan fierce-tilt">
          <div className="fierce-stat-cell__lbl">TOTAL EXPERIENCE</div>
          <div className="fierce-stat-cell__val">{totalXP.toLocaleString()}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>XP</span></div>
          <div className="fierce-stat-cell__sub">
            Level {level.actualLevel}
            {earnedToday > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+{earnedToday.toLocaleString()} pending</span></>
            )}
          </div>
        </div>
        <div className="fierce-stat-cell fierce-stat-cell--gold fierce-tilt">
          <div className="fierce-stat-cell__lbl">SHARDS BALANCE</div>
          <div className="fierce-stat-cell__val" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconShard className="fierce-shard" width={20} height={20} />
            {formatShards(shards)}
          </div>
          <div className="fierce-stat-cell__sub">
            <a href="#vault" style={{ color: 'var(--accent)', fontWeight: 600 }}>Spend in vault →</a>
          </div>
        </div>
      </section>

      {/* DISTRIBUTION + STREAKS */}
      <section className="fierce-grid fierce-distribution-row fierce-mt-4">
        <div className="fierce-card">
          <div className="fierce-card__body">
            <div className="fierce-row fierce-row--between fierce-mb-4">
              <span className="fierce-section-head__title">XP Distribution</span>
              <span className="fierce-eyebrow">All time</span>
            </div>
            <div className="fierce-row fierce-gap-4" style={{ flexWrap: 'wrap' }}>
              <FierceRing total={totalXP} strength={strength} intelligence={intelligence} charisma={charisma} />
              <div className="fierce-grow fierce-col" style={{ gap: 6 }}>
                {totalXP === 0 ? (
                  <div style={{ padding: '12px 0' }}>
                    <div className="fierce-eyebrow fierce-eyebrow--accent" style={{ marginBottom: 6 }}>NO XP YET</div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.5 }}>
                      Log your first debrief and the ring starts lighting up by category.
                    </p>
                    <button
                      className="fierce-btn fierce-btn--fierce fierce-btn--sm"
                      style={{ marginTop: 12 }}
                      onClick={onLogActivityClick}
                    >
                      <IconBolt /> Log activity
                    </button>
                  </div>
                ) : (
                  <>
                    <LegendRow label="Strength" color="#ff5e2e" value={strength} total={totalXP} />
                    <LegendRow label="Intelligence" color="#06d6f4" value={intelligence} total={totalXP} />
                    <LegendRow label="Charisma" color="#ec4899" value={charisma} total={totalXP} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fierce-card">
          <div className="fierce-card__body" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border-faint)' }}>
              <div className="fierce-row fierce-row--between">
                <span className="fierce-section-head__title">Streaks</span>
                <span className="fierce-eyebrow">Soft decay</span>
              </div>
            </div>
            {streaks.map((s) => (
              <div key={s.key} className="fierce-row fierce-row--between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-faint)' }}>
                <div className="fierce-row fierce-gap-2">
                  <IconFlame variant={s.flame} className="fierce-flame" />
                  <span style={{ fontWeight: 500 }}>{s.label}</span>
                </div>
                <div className="fierce-row fierce-gap-2">
                  <span style={{ fontFamily: "'Inter Tight'", fontWeight: 700, fontSize: 18 }}>
                    {s.days}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 3 }}>days</span>
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: s.mult > 1 ? 'var(--success)' : 'var(--text-muted)',
                      background: s.mult > 1 ? 'var(--success-soft)' : 'var(--bg-muted)',
                      padding: '2px 8px',
                      borderRadius: 'var(--r-pill)',
                    }}
                  >
                    {formatMultiplier(s.mult)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HEATMAP */}
      <section className="fierce-card fierce-mt-4">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-faint)' }} className="fierce-row fierce-row--between">
          <div>
            <span className="fierce-section-head__title">Activity</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Last 16 weeks · brighter cells = more XP</div>
          </div>
          <HeatmapLegend />
        </div>
        <div className="fierce-card__body">
          <FierceHeatmap activityHistory={user?.activityHistory} />
        </div>
      </section>
    </div>
  )
}

function LegendRow({ label, color, value, total }: { label: string; color: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100
  return (
    <div className="fierce-row fierce-row--between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-faint)' }}>
      <div className="fierce-row fierce-gap-2">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value.toLocaleString()}</strong> · {pct.toFixed(1)}%
      </span>
    </div>
  )
}

function HeatmapLegend() {
  return (
    <div className="fierce-row fierce-gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
      Less
      <span className="fierce-heatmap__cell" />
      <span className="fierce-heatmap__cell fierce-heatmap__cell--l1" />
      <span className="fierce-heatmap__cell fierce-heatmap__cell--l2" />
      <span className="fierce-heatmap__cell fierce-heatmap__cell--l3" />
      <span className="fierce-heatmap__cell fierce-heatmap__cell--l4" />
      More
    </div>
  )
}
