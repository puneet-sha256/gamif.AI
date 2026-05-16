import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { userDatabase } from '../client/services/fileUserDatabase'
import { userService } from '../client/services/userService'
import { apiClient } from '../client/services/apiClient'
import { calculateLevelProgress } from '../utils/levelCalculation'
import FierceConfetti from './FierceConfetti'
import { IconClose, IconStar, IconSparkle } from './FierceIcons'
import { formatShards } from './formatShards'

interface Props {
  onClose: () => void
}

export default function FierceRewardModal({ onClose }: Props) {
  const { user, refreshUserTasks } = useAuth()
  const { showSuccess, showError, showWarning } = useAlert()
  const [claiming, setClaiming] = useState(false)

  const rewards = user?.unclaimedRewards
  const totalActivities = rewards?.activities?.length || 0
  // Only celebrate after the user actually claims, not on every modal open.
  const [confettiBurst, setConfettiBurst] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !claiming) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, claiming])

  const handleClaimAll = async () => {
    if (!rewards || !user?.id) return
    setClaiming(true)
    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        showError('Session expired.')
        return
      }
      const currentLevel = calculateLevelProgress(user.stats?.experience || 0).actualLevel

      // Group by date
      const byDate = new Map<string, any>()
      rewards.activities.forEach((a: any) => {
        const date = a.activityDate || new Date().toISOString().split('T')[0]
        if (!byDate.has(date)) byDate.set(date, { activities: [], strengthXP: 0, intelligenceXP: 0, charismaXP: 0, totalXP: 0, totalShards: 0 })
        const g = byDate.get(date)
        g.activities.push(a)
        g.totalXP += a.xpEarned
        g.totalShards = Number((g.totalShards + a.shardsEarned).toFixed(2))
        if (a.category === 'Strength') g.strengthXP += a.xpEarned
        else if (a.category === 'Intelligence') g.intelligenceXP += a.xpEarned
        else if (a.category === 'Charisma') g.charismaXP += a.xpEarned
      })

      let leveledUp = false
      let newLevel = currentLevel
      let allOk = true
      for (const [date, g] of byDate.entries()) {
        const baseShardsBreakdown = { strength: 0, intelligence: 0, charisma: 0 }
        g.activities.forEach((a: any) => {
          const k = a.category.toLowerCase() as 'strength' | 'intelligence' | 'charisma'
          baseShardsBreakdown[k] = Number((baseShardsBreakdown[k] + a.shardsEarned).toFixed(2))
        })
        const r = await userService.claimRewards({
          sessionId,
          totalXP: g.totalXP,
          totalShards: g.totalShards,
          strengthXP: g.strengthXP,
          intelligenceXP: g.intelligenceXP,
          charismaXP: g.charismaXP,
          activityDate: date,
          baseShardsBreakdown,
        })
        if (!r.success) {
          allOk = false
        } else {
          const meta = r.experienceResult?.metadata
          if (meta?.leveledUp) {
            leveledUp = true
            newLevel = meta.newLevel
          }
        }
      }

      if (allOk) {
        const clear = await apiClient.put(`/user/${user.id}`, { unclaimedRewards: null })
        if (clear.success) {
          // Fire confetti BEFORE close so the burst is visible
          setConfettiBurst((c) => c + 1)
          await refreshUserTasks()
          showSuccess(
            leveledUp
              ? `🎊 LEVEL UP! Now level ${newLevel}.\nClaimed +${rewards.totalXP.toLocaleString()} XP and ${formatShards(rewards.totalShards)} ◆.`
              : `🔥 Claimed +${rewards.totalXP.toLocaleString()} XP and ${formatShards(rewards.totalShards)} ◆. Keep at it.`,
          )
          // Brief delay so the user sees the burst before the modal exits
          setTimeout(() => onClose(), 800)
        } else {
          showWarning('Rewards applied but cleanup failed. Refresh the page.')
        }
      } else {
        showError('Some claims failed. Try again.')
      }
    } catch {
      showError('Claim failed.')
    } finally {
      setClaiming(false)
    }
  }

  if (!rewards || totalActivities === 0) {
    return (
      <div className="fierce-modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="fierce-modal" role="dialog" aria-modal="true" aria-labelledby="fierce-reward-modal-title">
          <div className="fierce-modal__head">
            <div>
              <span className="fierce-eyebrow">UNCLAIMED REWARDS</span>
              <div id="fierce-reward-modal-title" className="fierce-modal__title" style={{ marginTop: 4 }}>Nothing to claim yet</div>
              <p className="fierce-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Log a debrief to start earning.
              </p>
            </div>
            <button className="fierce-icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <FierceConfetti show={confettiBurst > 0} count={90} key={confettiBurst} />
      <div className="fierce-modal-back" onClick={(e) => { if (e.target === e.currentTarget && !claiming) onClose() }}>
        <div className="fierce-modal" role="dialog" aria-modal="true" aria-labelledby="fierce-reward-modal-title">
          <div className="fierce-modal__head" style={{ position: 'relative', overflow: 'hidden', padding: '36px 20px 16px' }}>
            <div
              style={{
                position: 'absolute',
                top: -36,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #facc15, #fb923c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 28px rgba(251, 146, 60, 0.45)',
                zIndex: 2,
              }}
            >
              <IconStar style={{ width: 32, height: 32, color: '#fff', strokeWidth: 1.6, fill: '#fff' }} />
            </div>
            <div style={{ marginTop: 14 }}>
              <span className="fierce-eyebrow fierce-eyebrow--accent">MISSION COMPLETE</span>
              <div
                id="fierce-reward-modal-title"
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: '-0.025em',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                You earned this.{' '}
                <IconSparkle className="fierce-sparkle fierce-sparkle--amber" style={{ verticalAlign: -3, marginLeft: 2 }} />
              </div>
              <div className="fierce-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{totalActivities} activities · claim your spoils</div>
            </div>
            <button className="fierce-icon-btn" onClick={onClose} aria-label="Close" style={{ position: 'relative', zIndex: 1 }}>
              <IconClose />
            </button>
          </div>
          <div className="fierce-modal__body">
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid transparent',
                borderRadius: 'var(--r-md)',
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Total XP</div>
                <div style={{ fontFamily: "'Inter Tight'", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.025em' }}>+{rewards.totalXP}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Total shards</div>
                <div style={{ fontFamily: "'Inter Tight'", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.025em' }}>+{formatShards(rewards.totalShards)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>◆</span></div>
              </div>
            </div>

            <div className="fierce-col">
              {rewards.activities.map((a: any, i: number) => {
                const dotColor = { Strength: 'var(--strength)', Intelligence: 'var(--intel)', Charisma: 'var(--charisma)' }[a.category as 'Strength' | 'Intelligence' | 'Charisma']
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', background: 'var(--bg-muted)', color: dotColor }}>
                      <span className="fierce-dot" style={{ width: 10, height: 10 }} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{a.activityName || a.activity || 'Activity'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {a.category} · matched <em>{a.taskMatched || 'mission'}</em>
                      </div>
                    </div>
                    <div className="fierce-row fierce-gap-2" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: 'var(--accent-text)' }}>+{a.xpEarned} XP</span>
                      <span>+{formatShards(a.shardsEarned)} ◆</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="fierce-modal__foot">
            <button className="fierce-btn fierce-btn--ghost" onClick={onClose} disabled={claiming}>Maybe later</button>
            <button className="fierce-btn fierce-btn--fierce" onClick={handleClaimAll} disabled={claiming}>
              {claiming ? 'Claiming…' : 'Claim all rewards'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
