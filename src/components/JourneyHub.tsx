import type { User } from '../shared/types'
import {
  calculateProgressAnalytics,
  getAchievements,
  getCurrentCampaign,
} from '../utils/progressionInsights'
import { calculateActualLevel } from '../utils/levelCalculation'
import './ProgressionHub.css'

interface JourneyHubProps {
  user: User
  socialCounts: {
    followers: number
    following: number
    partyMembers: number
  }
}

const JourneyHub: React.FC<JourneyHubProps> = ({ user, socialCounts }) => {
  const analytics = calculateProgressAnalytics(user)
  const campaign = getCurrentCampaign(user)
  const achievements = getAchievements(user, socialCounts)
  const level = calculateActualLevel(user.stats?.experience || 0)
  const achievementsUnlocked = level >= 5
  const unlockedCount = achievements.filter(achievement => achievement.unlocked).length
  const bossProgress = Math.min(100, (campaign.personalDamage / campaign.targetXp) * 100)
  const categoryTotal = Object.values(analytics.categoryXp).reduce((sum, value) => sum + value, 0)

  return (
    <div className="tab-content progression-hub" data-tour="journey-hub">
      <div className="progression-heading">
        <div>
          <p className="progression-kicker">YOUR JOURNEY</p>
          <h2>Campaigns, achievements & insights</h2>
          <p>See what your effort is building and choose where to focus next.</p>
        </div>
        <div
          className="achievement-total"
          aria-label={
            achievementsUnlocked
              ? `${unlockedCount} achievements unlocked`
              : `Achievements unlock at Level 5. Current level ${level}`
          }
        >
          <strong>{achievementsUnlocked ? `${unlockedCount}/${achievements.length}` : 'Level 5'}</strong>
          <span>{achievementsUnlocked ? 'Badges unlocked' : 'Achievements unlock'}</span>
        </div>
      </div>

      <section className="campaign-card" aria-labelledby="campaign-title">
        <div className="campaign-boss" aria-hidden="true">{campaign.icon}</div>
        <div className="campaign-content">
          <div className="campaign-meta">
            <span>SEASONAL CAMPAIGN</span>
            <span>{campaign.daysRemaining} days remaining</span>
          </div>
          <h3 id="campaign-title">{campaign.name}: {campaign.bossName}</h3>
          <p>
            Every XP earned this season deals one damage. Defeat the boss before
            {` ${new Date(`${campaign.endsAt}T00:00:00`).toLocaleDateString()}`}.
          </p>
          <div
            className="boss-health"
            role="progressbar"
            aria-label="Seasonal boss damage"
            aria-valuemin={0}
            aria-valuemax={campaign.targetXp}
            aria-valuenow={campaign.personalDamage}
          >
            <span style={{ width: `${bossProgress}%` }} />
          </div>
          <div className="boss-stats">
            <strong>{campaign.personalDamage.toLocaleString()} damage</strong>
            <span>{Math.max(0, campaign.targetXp - campaign.personalDamage).toLocaleString()} HP remaining</span>
          </div>
        </div>
      </section>

      <section className="progression-section" aria-labelledby="analytics-title">
        <div className="section-title-row">
          <div>
            <p className="progression-kicker">ANALYTICS</p>
            <h3 id="analytics-title">Your momentum</h3>
          </div>
          <span className="insight-pill">Strongest: {analytics.bestCategory}</span>
        </div>
        <div className="analytics-grid">
          <article><strong>{analytics.last30DaysXp}</strong><span>XP in 30 days</span></article>
          <article><strong>{analytics.totalActiveDays}</strong><span>Active days</span></article>
          <article><strong>{analytics.currentActiveStreak}</strong><span>Current streak</span></article>
          <article><strong>{analytics.averageXpPerActiveDay}</strong><span>Avg XP / active day</span></article>
          <article><strong>{analytics.bestDayXp}</strong><span>Best day XP</span></article>
        </div>
        <div className="attribute-bars">
          {(Object.entries(analytics.categoryXp) as Array<[keyof typeof analytics.categoryXp, number]>)
            .map(([category, xp]) => (
              <div className="attribute-bar-row" key={category}>
                <span>{category}</span>
                <div className="attribute-bar"><span style={{ width: `${categoryTotal ? (xp / categoryTotal) * 100 : 0}%` }} /></div>
                <strong>{xp} XP</strong>
              </div>
            ))}
        </div>
      </section>

      <section className="progression-section" aria-labelledby="achievements-title">
        <div className="section-title-row">
          <div>
            <p className="progression-kicker">ACHIEVEMENTS</p>
            <h3 id="achievements-title">Milestones worth remembering</h3>
          </div>
        </div>
        {achievementsUnlocked ? (
          <div className="achievement-grid">
            {achievements.map(achievement => (
              <article
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : ''}`}
                key={achievement.id}
              >
                <span className="achievement-icon" aria-hidden="true">{achievement.icon}</span>
                <div>
                  <h4>{achievement.title}</h4>
                  <p>{achievement.description}</p>
                  <span>{achievement.unlocked ? 'Unlocked' : `${achievement.progress}/${achievement.target}`}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="feature-lock" role="status">
            <span className="feature-lock-icon" aria-hidden="true">🔒</span>
            <div>
              <h4>Reach Level 5 to unlock Achievements</h4>
              <p>
                You are Level {level}. Earn XP through daily activities to reveal
                badges and start recording milestone unlocks.
              </p>
              <strong>{5 - level} level{5 - level === 1 ? '' : 's'} to go</strong>
            </div>
          </div>
        )}
      </section>

      <details className="feature-guide">
        <summary>How Journey works</summary>
        <p>
          Campaign damage and analytics come from claimed activity XP. Badges unlock
          automatically from your stats, streaks, and Guild relationships—there is
          nothing extra to submit.
        </p>
      </details>
    </div>
  )
}

export default JourneyHub
