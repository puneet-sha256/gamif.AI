import { apiClient } from './apiClient'
import type {
  CommunityState as SharedCommunityState,
  CommunityUserSnapshot,
  CommunityIdentity,
  CommunitySearchResult,
  Party as SharedParty,
  PartyInvite as SharedPartyInvite,
  PartyMemberSnapshot,
} from '../../shared/types'

export type PublicPlayer = CommunityUserSnapshot
export type FollowerIdentity = CommunityIdentity
export type PartyMember = PartyMemberSnapshot
export type Party = SharedParty
export type PartyInvite = SharedPartyInvite
export type CommunityState = Omit<SharedCommunityState, 'user'> & {
  user?: CommunityUserSnapshot
}
export type PlayerSearchResult = CommunitySearchResult

class CommunityService {
  getState(sessionId: string) {
    return apiClient.get<CommunityState>(`/community/${encodeURIComponent(sessionId)}`)
  }

  search(sessionId: string, query: string, signal?: AbortSignal) {
    return apiClient.get<PlayerSearchResult[]>(
      `/community/search/${encodeURIComponent(sessionId)}?q=${encodeURIComponent(query)}`,
      { signal }
    )
  }

  follow(sessionId: string, username: string) {
    return apiClient.post<CommunityState>('/community/follow', { sessionId, username })
  }

  acceptFollowRequest(sessionId: string, userId: string) {
    return apiClient.post<CommunityState>('/community/follow-request/accept', { sessionId, userId })
  }

  declineFollowRequest(sessionId: string, userId: string) {
    return apiClient.post<CommunityState>('/community/follow-request/decline', { sessionId, userId })
  }

  cancelFollowRequest(sessionId: string, userId: string) {
    return apiClient.post<CommunityState>('/community/follow-request/cancel', { sessionId, userId })
  }

  unfollow(sessionId: string, userId: string) {
    return apiClient.delete<CommunityState>('/community/follow', { sessionId, userId })
  }

  createParty(sessionId: string, name: string) {
    return apiClient.post<CommunityState>('/community/party/create', { sessionId, name })
  }

  inviteToParty(sessionId: string, username: string) {
    return apiClient.post<CommunityState>('/community/party/invite', { sessionId, username })
  }

  acceptPartyInvite(sessionId: string, inviteId: string) {
    return apiClient.post<CommunityState>('/community/party/accept', { sessionId, inviteId })
  }

  leaveParty(sessionId: string) {
    return apiClient.post<CommunityState>('/community/party/leave', { sessionId })
  }
}

export const communityService = new CommunityService()
