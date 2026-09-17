import { createPortal } from 'react-dom'
import type { CommunityUserSnapshot } from '../shared/types'
import './SocialModal.css'
import { useModalFocus } from './useModalFocus'

interface PlayerProfileModalProps {
  player: CommunityUserSnapshot | null
  onClose: () => void
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, onClose }) => {
  const { dialogRef, initialFocusRef } = useModalFocus(!!player, onClose)

  if (!player) return null

  const attributeTotal =
    player.attributes.strength + player.attributes.intelligence + player.attributes.charisma
  const bestRecentDay = Math.max(1, ...player.recentActivity.map(activity => activity.total))

  return createPortal(
    <div className="social-modal-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <article ref={dialogRef} className="social-modal player-profile-modal" role="dialog" aria-modal="true" aria-labelledby="player-profile-title">
        <header>
          <div>
            <p>CONNECTED PROFILE</p>
            <h2 id="player-profile-title">{player.name}</h2>
          </div>
          <button ref={initialFocusRef} type="button" onClick={onClose} aria-label="Close player profile">×</button>
        </header>

        <div className="profile-hero">
          <span className="profile-avatar" aria-hidden="true">
            {(player.name || player.username).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h3>{player.name}</h3>
            <p>@{player.username}</p>
            <span>Member since {new Date(player.memberSince).toLocaleDateString()}</span>
          </div>
          <strong>Level {player.level}</strong>
        </div>

        <div className="profile-metric-grid">
          <span><strong>{player.experience.toLocaleString()}</strong>Total XP</span>
          <span><strong>{player.last30DaysXp.toLocaleString()}</strong>30-day XP</span>
          <span><strong>{player.activeDays}</strong>Active days</span>
          <span><strong>{player.currentStreak}</strong>Day streak</span>
          <span><strong>{player.bestDayXp}</strong>Best day XP</span>
        </div>

        <section className="profile-section">
          <h3>Attribute build</h3>
          {(Object.entries(player.attributes) as Array<[keyof typeof player.attributes, number]>)
            .map(([attribute, xp]) => (
              <div className="profile-attribute-row" key={attribute}>
                <span>{attribute[0].toUpperCase() + attribute.slice(1)}</span>
                <div><span style={{ width: `${attributeTotal ? (xp / attributeTotal) * 100 : 0}%` }} /></div>
                <strong>{xp} XP</strong>
              </div>
            ))}
        </section>

        <section className="profile-section">
          <h3>Recent XP timeline</h3>
          {player.recentActivity.length === 0 ? (
            <p className="social-empty">No recent activity shared yet.</p>
          ) : (
            <div className="profile-timeline" aria-label="Recent XP timeline">
              {player.recentActivity.map(activity => (
                <div key={activity.date} title={`${activity.date}: ${activity.total} XP`}>
                  <span style={{ height: `${Math.max(8, (activity.total / bestRecentDay) * 100)}%` }} />
                  <small>{new Date(`${activity.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
                  <strong>{activity.total}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="profile-privacy-note">
          Only progress summaries are shared. Goals, email, rewards, inventory, and
          detailed activity descriptions remain private.
        </p>
      </article>
    </div>,
    document.body
  )
}

export default PlayerProfileModal
