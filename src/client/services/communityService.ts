import { apiClient } from './apiClient'
import type {
  CommunityState as SharedCommunityState,
  CommunityUserSnapshot,
  Party as SharedParty,
  PartyInvite as SharedPartyInvite,
  PartyMemberSnapshot,
} from '../../shared/types'

export type PublicPlayer = CommunityUserSnapshot
export type PartyMember = PartyMemberSnapshot
export type Party = SharedParty
export type PartyInvite = SharedPartyInvite
export type CommunityState = Omit<SharedCommunityState, 'user'> & {
  user?: CommunityUserSnapshot
}

class CommunityService {
  getState(sessionId: string) {
    return apiClient.get<CommunityState>(`/community/${encodeURIComponent(sessionId)}`)
  }

  follow(sessionId: string, username: string) {
    return apiClient.post<CommunityState>('/community/follow', { sessionId, username })
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
