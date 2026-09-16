import { useCallback, useEffect, useState } from 'react'
import {
  communityService,
  type CommunityState,
  type PublicPlayer,
} from '../client/services/communityService'
import './ProgressionHub.css'

interface CommunityHubProps {
  currentUserId: string
  sessionId: string | null
  onStateChange: (state: CommunityState) => void
}

const EMPTY_STATE: CommunityState = {
  followers: [],
  following: [],
  partyInvites: [],
}

const CommunityHub: React.FC<CommunityHubProps> = ({
  currentUserId,
  sessionId,
  onStateChange,
}) => {
  const [state, setState] = useState<CommunityState>(EMPTY_STATE)
  const [username, setUsername] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyInviteUsername, setPartyInviteUsername] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  const applyState = useCallback((nextState?: CommunityState) => {
    const resolved = nextState || EMPTY_STATE
    setState(resolved)
    onStateChange(resolved)
  }, [onStateChange])

  const loadState = useCallback(async () => {
    if (!sessionId) return
    try {
      const response = await communityService.getState(sessionId)
      applyState(response.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your Guild.')
    }
  }, [applyState, sessionId])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const runAction = async (
    action: () => Promise<{ data?: CommunityState; message?: string }>,
    successMessage: string
  ) => {
    setIsWorking(true)
    setError('')
    setMessage('')
    try {
      const response = await action()
      if (response.data) {
        applyState(response.data)
      } else {
        await loadState()
      }
      setMessage(successMessage || response.message || 'Guild updated.')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The Guild action failed.')
    } finally {
      setIsWorking(false)
    }
  }

  const renderPlayer = (player: PublicPlayer, canUnfollow = false) => (
    <li className="player-row" key={player.id}>
      <span className="player-avatar" aria-hidden="true">
        {(player.name || player.username).slice(0, 1).toUpperCase()}
      </span>
      <span>
        <strong>{player.name || player.username}</strong>
        <small>@{player.username} · Level {player.level}</small>
      </span>
      {canUnfollow && (
        <button
          type="button"
          className="secondary-action"
          disabled={isWorking}
          onClick={() => void runAction(
            () => communityService.unfollow(sessionId!, player.id),
            `Unfollowed @${player.username}.`
          )}
        >
          Unfollow
        </button>
      )}
    </li>
  )

  const isPartyOwner = state.party?.ownerId === currentUserId

  return (
    <div className="tab-content progression-hub" data-tour="guild-hub">
      <div className="progression-heading">
        <div>
          <p className="progression-kicker">GUILD</p>
          <h2>Progress is stronger together</h2>
          <p>Follow players, form a party, and bring allies into seasonal campaigns.</p>
        </div>
        <div className="guild-counts">
          <span><strong>{state.followers.length}</strong> Followers</span>
          <span><strong>{state.following.length}</strong> Following</span>
        </div>
      </div>

      {(message || error) && (
        <div className={`guild-message ${error ? 'error' : ''}`} role="status">
          {error || message}
        </div>
      )}

      <section className="progression-section" aria-labelledby="find-allies-title">
        <div className="section-title-row">
          <div>
            <p className="progression-kicker">SOCIAL</p>
            <h3 id="find-allies-title">Find an ally</h3>
          </div>
        </div>
        <form
          className="guild-form"
          onSubmit={event => {
            event.preventDefault()
            const nextUsername = username.trim()
            if (!nextUsername || !sessionId) return
            void runAction(
              () => communityService.follow(sessionId, nextUsername),
              `Now following @${nextUsername}.`
            ).then(() => setUsername(''))
          }}
        >
          <label htmlFor="follow-username">Exact username</label>
          <div>
            <input
              id="follow-username"
              value={username}
              maxLength={40}
              autoComplete="off"
              placeholder="player_name"
              onChange={event => setUsername(event.target.value)}
            />
            <button type="submit" disabled={isWorking || !username.trim()}>Follow</button>
          </div>
        </form>

        <div className="social-columns">
          <div>
            <h4>Following</h4>
            {state.following.length ? (
              <ul className="player-list">{state.following.map(player => renderPlayer(player, true))}</ul>
            ) : <p className="empty-copy">Follow someone to start your network.</p>}
          </div>
          <div>
            <h4>Followers</h4>
            {state.followers.length ? (
              <ul className="player-list">{state.followers.map(player => renderPlayer(player))}</ul>
            ) : <p className="empty-copy">Your future allies will appear here.</p>}
          </div>
        </div>
      </section>

      <section className="progression-section" aria-labelledby="party-title">
        <div className="section-title-row">
          <div>
            <p className="progression-kicker">PARTY</p>
            <h3 id="party-title">{state.party?.name || 'Create your first party'}</h3>
          </div>
          {state.party && (
            <button
              type="button"
              className="danger-action"
              disabled={isWorking}
              onClick={() => void runAction(
                () => communityService.leaveParty(sessionId!),
                isPartyOwner ? 'Party disbanded.' : 'You left the party.'
              )}
            >
              {isPartyOwner ? 'Disband party' : 'Leave party'}
            </button>
          )}
        </div>

        {!state.party ? (
          <form
            className="guild-form"
            onSubmit={event => {
              event.preventDefault()
              const name = partyName.trim()
              if (!sessionId || name.length < 2) return
              void runAction(
                () => communityService.createParty(sessionId, name),
                `${name} is ready.`
              ).then(() => setPartyName(''))
            }}
          >
            <label htmlFor="party-name">Party name</label>
            <div>
              <input
                id="party-name"
                value={partyName}
                minLength={2}
                maxLength={40}
                placeholder="Night Raiders"
                onChange={event => setPartyName(event.target.value)}
              />
              <button type="submit" disabled={isWorking || partyName.trim().length < 2}>Create</button>
            </div>
          </form>
        ) : (
          <>
            <div className="party-roster">
              {state.party.members.map(member => (
                <article key={member.id}>
                  <span className="player-avatar" aria-hidden="true">
                    {(member.name || member.username).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{member.name || member.username}</strong>
                    <small>
                      @{member.username} · {member.contributionXp.toLocaleString()} XP
                      {member.id === state.party?.ownerId ? ' · Leader' : ''}
                    </small>
                  </div>
                </article>
              ))}
            </div>
            {isPartyOwner && (
              <form
                className="guild-form"
                onSubmit={event => {
                  event.preventDefault()
                  const nextUsername = partyInviteUsername.trim()
                  if (!sessionId || !nextUsername) return
                  void runAction(
                    () => communityService.inviteToParty(sessionId, nextUsername),
                    `Invitation sent to @${nextUsername}.`
                  ).then(() => setPartyInviteUsername(''))
                }}
              >
                <label htmlFor="party-invite-username">Invite by username</label>
                <div>
                  <input
                    id="party-invite-username"
                    value={partyInviteUsername}
                    maxLength={40}
                    placeholder="future_ally"
                    onChange={event => setPartyInviteUsername(event.target.value)}
                  />
                  <button type="submit" disabled={isWorking || !partyInviteUsername.trim()}>Invite</button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {state.partyInvites.length > 0 && (
        <section className="progression-section" aria-labelledby="invites-title">
          <p className="progression-kicker">INVITATIONS</p>
          <h3 id="invites-title">Parties want you</h3>
          <div className="invite-list">
            {state.partyInvites.map(invite => (
              <article key={invite.id}>
                <div>
                  <strong>{invite.partyName}</strong>
                  <span>Invited by @{invite.invitedByUsername}</span>
                </div>
                <button
                  type="button"
                  disabled={isWorking || !!state.party}
                  onClick={() => void runAction(
                    () => communityService.acceptPartyInvite(sessionId!, invite.id),
                    `Joined ${invite.partyName}.`
                  )}
                >
                  Accept
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <details className="feature-guide">
        <summary>How Guild works</summary>
        <p>
          Following is one-way: it lets you build a circle without exposing private
          goals or activity. Party leaders can invite members by username. Your party
          only sees public name, level, and XP contribution.
        </p>
      </details>
    </div>
  )
}

export default CommunityHub
