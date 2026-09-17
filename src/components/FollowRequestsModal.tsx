import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { FollowRequest } from '../shared/types'
import {
  communityService,
  type CommunityState,
} from '../client/services/communityService'
import './SocialModal.css'
import { useModalFocus } from './useModalFocus'

interface FollowRequestsModalProps {
  isOpen: boolean
  sessionId: string | null
  requests: FollowRequest[]
  onClose: () => void
  onUpdated: (state: CommunityState) => void
}

const FollowRequestsModal: React.FC<FollowRequestsModalProps> = ({
  isOpen,
  sessionId,
  requests,
  onClose,
  onUpdated,
}) => {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const { dialogRef, initialFocusRef } = useModalFocus(isOpen, onClose, !isWorking)

  const respond = async (request: FollowRequest, accept: boolean) => {
    if (!sessionId) return
    setIsWorking(true)
    setError('')
    try {
      const response = accept
        ? await communityService.acceptFollowRequest(sessionId, request.id)
        : await communityService.declineFollowRequest(sessionId, request.id)
      if (response.data) {
        onUpdated(response.data)
        if (response.data.receivedFollowRequests.length === 0) onClose()
      }
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Could not update request.')
    } finally {
      setIsWorking(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="social-modal-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !isWorking) onClose()
    }}>
      <section ref={dialogRef} className="social-modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <header>
          <div>
            <p>NOTIFICATIONS</p>
            <h2 id="request-modal-title">Follow requests</h2>
          </div>
          <button ref={initialFocusRef} type="button" onClick={onClose} aria-label="Close follow requests">×</button>
        </header>
        {error && <div className="social-modal-error" role="alert">{error}</div>}
        <div className="request-modal-list">
          {requests.length === 0 ? (
            <p className="social-empty">You have no pending follow requests.</p>
          ) : requests.map(request => (
            <article key={request.id}>
              <span className="player-avatar" aria-hidden="true">
                {(request.name || request.username).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{request.name}</strong>
                <span>@{request.username} wants to follow you</span>
              </div>
              <button type="button" disabled={isWorking} onClick={() => void respond(request, true)}>Accept</button>
              <button type="button" className="social-secondary" disabled={isWorking} onClick={() => void respond(request, false)}>Decline</button>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body
  )
}

export default FollowRequestsModal
