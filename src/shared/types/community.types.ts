export interface CommunityUserSnapshot {
  id: string
  username: string
  name: string
  level: number
  experience: number
  attributes: {
    strength: number
    intelligence: number
    charisma: number
  }
  activeDays: number
  memberSince: string
}

export interface CommunityIdentity {
  id: string
  username: string
  name: string
}

export interface FollowRequest extends CommunityIdentity {
  requestedAt: string
}

export interface PartyMemberSnapshot extends CommunityUserSnapshot {
  joinedAt: string
  contributionXp: number
}

export interface Party {
  id: string
  name: string
  ownerId: string
  members: PartyMemberSnapshot[]
  createdAt: string
}

export interface PartyInvite {
  id: string
  partyId: string
  partyName: string
  invitedById: string
  invitedByUsername: string
  createdAt: string
}

export interface CommunityState {
  user: CommunityUserSnapshot
  following: CommunityUserSnapshot[]
  followers: CommunityIdentity[]
  receivedFollowRequests: FollowRequest[]
  sentFollowRequests: FollowRequest[]
  party?: Party
  partyInvites: PartyInvite[]
}

export interface CommunitySearchResult {
  id: string
  username: string
  name: string
  isFollowing: boolean
  followsYou: boolean
  requestSent: boolean
  requestReceived: boolean
}

export interface CommunitySessionRequest {
  sessionId: string
}

export interface FollowUserRequest extends CommunitySessionRequest {
  username: string
}

export interface UnfollowUserRequest extends CommunitySessionRequest {
  username?: string
  userId?: string
}

export interface FollowRequestActionRequest extends CommunitySessionRequest {
  userId: string
}

export interface CreatePartyRequest extends CommunitySessionRequest {
  name: string
}

export interface InviteToPartyRequest extends CommunitySessionRequest {
  username: string
}

export interface AcceptPartyInviteRequest extends CommunitySessionRequest {
  partyId?: string
  inviteId?: string
}
