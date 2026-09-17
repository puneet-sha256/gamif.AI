import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import type {
  CommunityState,
  CommunitySearchResult,
  CommunityIdentity,
  CommunityUserSnapshot,
  FollowRequest,
  FollowRequestActionRequest,
  AcceptPartyInviteRequest,
  CommunitySessionRequest,
  CreatePartyRequest,
  FollowUserRequest,
  InviteToPartyRequest,
  Party,
  PartyInvite,
  PartyMemberSnapshot,
  UnfollowUserRequest,
  User,
} from '../../shared/types'
import {
  findSessionById,
  findUserById,
  findUserByUsername,
  updateSessionLastAccess,
  updateUser,
  mutateUser,
  searchUsers,
} from '../utils/dataOperations'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorMessages,
} from '../utils/responseHelpers'
import { logger } from '../../utils/logger'
import { calculateActualLevel } from '../../utils/levelCalculation'

const MAX_ID_LENGTH = 128

function validString(value: unknown, maxLength = MAX_ID_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
}

function experienceFor(user: User): number {
  if (!user.stats) return 0
  const explicit = Number(user.stats.experience)
  if (Number.isFinite(explicit) && explicit >= 0) return explicit
  return Math.max(0, user.stats.strength || 0)
    + Math.max(0, user.stats.intelligence || 0)
    + Math.max(0, user.stats.charisma || 0)
}

function publicSnapshot(user: User): CommunityUserSnapshot {
  const activities = [...(user.activityHistory?.dailyActivities || [])]
    .filter(activity => activity.total > 0)
    .sort((left, right) => left.date.localeCompare(right.date))
  const now = new Date()
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  cutoff.setUTCDate(cutoff.getUTCDate() - 29)
  const cutoffDate = cutoff.toISOString().split('T')[0]
  const activeDates = new Set(activities.map(activity => activity.date))
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (!activeDates.has(cursor.toISOString().split('T')[0])) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  let currentStreak = 0
  while (activeDates.has(cursor.toISOString().split('T')[0])) {
    currentStreak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return {
    id: user.id,
    username: user.username,
    name: user.profileData?.name || user.username,
    level: calculateActualLevel(experienceFor(user)),
    experience: experienceFor(user),
    attributes: {
      strength: user.stats?.strength || 0,
      intelligence: user.stats?.intelligence || 0,
      charisma: user.stats?.charisma || 0,
    },
    activeDays: (user.activityHistory?.dailyActivities || [])
      .filter(activity => activity.total > 0).length,
    memberSince: user.createdAt,
    last30DaysXp: activities
      .filter(activity => activity.date >= cutoffDate)
      .reduce((sum, activity) => sum + activity.total, 0),
    bestDayXp: activities.reduce((best, activity) => Math.max(best, activity.total), 0),
    currentStreak,
    recentActivity: activities.slice(-14).map(activity => ({
      date: activity.date,
      total: activity.total,
    })),
  }
}

function identitySnapshot(user: User): CommunityIdentity {
  return {
    id: user.id,
    username: user.username,
    name: user.profileData?.name || user.username,
  }
}

function followRequestSnapshot(user: User, requestedAt: string): FollowRequest {
  return {
    ...identitySnapshot(user),
    requestedAt,
  }
}

function partyMemberSnapshot(user: User, joinedAt = new Date().toISOString()): PartyMemberSnapshot {
  const experience = experienceFor(user)
  return {
    ...identitySnapshot(user),
    level: calculateActualLevel(experience),
    joinedAt,
    contributionXp: experience,
  }
}

async function authenticate(sessionId: unknown): Promise<
  | { user: User; sessionId: string }
  | { status: number; message: string }
> {
  if (!validString(sessionId)) {
    return { status: 400, message: 'A valid sessionId is required' }
  }

  const normalizedSessionId = sessionId.trim()
  const session = await findSessionById(normalizedSessionId)
  if (!session) {
    return { status: 401, message: ErrorMessages.INVALID_SESSION }
  }

  await updateSessionLastAccess(normalizedSessionId)
  const user = await findUserById(session.userId)
  if (!user) {
    return { status: 404, message: ErrorMessages.USER_NOT_FOUND }
  }

  return { user, sessionId: normalizedSessionId }
}

function isAuthError(
  result: Awaited<ReturnType<typeof authenticate>>
): result is { status: number; message: string } {
  return 'status' in result
}

async function refreshedFollowing(
  owner: User,
  snapshots: CommunityUserSnapshot[] | undefined
): Promise<CommunityUserSnapshot[]> {
  const users = await Promise.all((snapshots || []).map(snapshot => findUserById(snapshot.id)))
  return users
    .filter((user): user is User =>
      !!user && (user.followers || []).some(follower => follower.id === owner.id)
    )
    .map(publicSnapshot)
}

async function refreshedFollowers(
  owner: User,
  snapshots: CommunityIdentity[] | undefined
): Promise<CommunityIdentity[]> {
  const users = await Promise.all((snapshots || []).map(snapshot => findUserById(snapshot.id)))
  return users
    .filter((user): user is User =>
      !!user && (user.following || []).some(followed => followed.id === owner.id)
    )
    .map(identitySnapshot)
}

async function refreshFollowRequests(
  user: User,
  direction: 'received' | 'sent'
): Promise<FollowRequest[]> {
  const requests = direction === 'received'
    ? user.receivedFollowRequests || []
    : user.sentFollowRequests || []
  const refreshed = await Promise.all(requests.map(async request => {
    const counterpart = await findUserById(request.id)
    if (!counterpart) return undefined
    const reciprocal = direction === 'received'
      ? counterpart.sentFollowRequests?.some(item => item.id === user.id)
      : counterpart.receivedFollowRequests?.some(item => item.id === user.id)
    return reciprocal
      ? followRequestSnapshot(counterpart, request.requestedAt)
      : undefined
  }))
  return refreshed.filter((request): request is FollowRequest => !!request)
}

async function canonicalParty(party: Party): Promise<Party> {
  const users = await Promise.all(party.members.map(member => findUserById(member.id)))
  const members = users
    .filter((user): user is User => !!user)
    .map(user => partyMemberSnapshot(
      user,
      party.members.find(member => member.id === user.id)?.joinedAt
    ))
  return { ...party, members }
}

async function synchronizeParty(party: Party): Promise<Party> {
  const refreshed = await canonicalParty(party)
  for (const member of refreshed.members) {
    await updateUser(member.id, { party: refreshed })
  }
  return refreshed
}

async function refreshInvites(user: User): Promise<PartyInvite[]> {
  if (user.party) return []

  const refreshed = await Promise.all((user.partyInvites || []).map(async invite => {
    const owner = await findUserById(invite.invitedById)
    if (!owner?.party || owner.party.id !== invite.partyId || owner.party.ownerId !== owner.id) {
      return undefined
    }
    return {
      ...invite,
      partyName: owner.party.name,
      invitedByUsername: owner.username,
    }
  }))

  return refreshed.filter((invite): invite is PartyInvite => !!invite)
}

async function buildCommunityState(user: User): Promise<CommunityState> {
  const [
    following,
    followers,
    receivedFollowRequests,
    sentFollowRequests,
    partyInvites,
  ] = await Promise.all([
    refreshedFollowing(user, user.following),
    refreshedFollowers(user, user.followers),
    refreshFollowRequests(user, 'received'),
    refreshFollowRequests(user, 'sent'),
    refreshInvites(user),
  ])

  let party: Party | undefined
  if (user.party) {
    const owner = await findUserById(user.party.ownerId)
    const isCanonicalMember = owner?.party?.members.some(member => member.id === user.id)
    if (
      owner?.party
      && owner.party.id === user.party.id
      && owner.party.ownerId === owner.id
      && isCanonicalMember
    ) {
      party = await synchronizeParty(owner.party)
    } else {
      await updateUser(user.id, { party: undefined })
    }
  }

  if (
    JSON.stringify(following) !== JSON.stringify(user.following || [])
    || JSON.stringify(followers) !== JSON.stringify(user.followers || [])
    || JSON.stringify(receivedFollowRequests) !== JSON.stringify(user.receivedFollowRequests || [])
    || JSON.stringify(sentFollowRequests) !== JSON.stringify(user.sentFollowRequests || [])
    || JSON.stringify(partyInvites) !== JSON.stringify(user.partyInvites || [])
  ) {
    await updateUser(user.id, {
      following,
      followers,
      receivedFollowRequests,
      sentFollowRequests,
      partyInvites,
    })
  }

  return {
    user: publicSnapshot(user),
    following,
    followers,
    receivedFollowRequests,
    sentFollowRequests,
    party,
    partyInvites,
  }
}

function sendAuthError(res: Response, result: { status: number; message: string }) {
  return res.status(result.status).json(createErrorResponse(result.message))
}

function requireGuildAccess(user: User, res: Response): boolean {
  if (calculateActualLevel(experienceFor(user)) >= 10) return true
  res.status(403).json(createErrorResponse('Guild features unlock at Level 10'))
  return false
}

export async function getCommunityState(req: Request<{ sessionId: string }>, res: Response) {
  try {
    const auth = await authenticate(req.params.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)

    const state = await buildCommunityState(auth.user)
    return res.json(createSuccessResponse('Community state retrieved successfully', state))
  } catch (error) {
    logger.error('Get community state error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function searchCommunityUsers(
  req: Request<{ sessionId: string }, object, object, { q?: string }>,
  res: Response
) {
  try {
    const auth = await authenticate(req.params.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.query.q, 40) || req.query.q.trim().length < 2) {
      return res.status(400).json(createErrorResponse(
        'Search query must be between 2 and 40 characters'
      ))
    }

    const matches = await searchUsers(req.query.q.trim(), 24)
    const followingIds = new Set((auth.user.following || []).map(user => user.id))
    const followerIds = new Set((auth.user.followers || []).map(user => user.id))
    const sentRequestIds = new Set((auth.user.sentFollowRequests || []).map(user => user.id))
    const receivedRequestIds = new Set((auth.user.receivedFollowRequests || []).map(user => user.id))
    const results: CommunitySearchResult[] = matches
      .filter(user => user.id !== auth.user.id)
      .map(user => ({
        id: user.id,
        username: user.username,
        name: user.profileData?.name || user.username,
        isFollowing: followingIds.has(user.id),
        followsYou: followerIds.has(user.id),
        requestSent: sentRequestIds.has(user.id),
        requestReceived: receivedRequestIds.has(user.id),
      }))
      .slice(0, 8)

    return res.json(createSuccessResponse('Matching players retrieved successfully', results))
  } catch (error) {
    logger.error('Search community users error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function followUser(req: Request<object, object, FollowUserRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.body?.username)) {
      return res.status(400).json(createErrorResponse('A valid username is required'))
    }

    const target = await findUserByUsername(req.body.username.trim())
    if (!target) return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    if (target.id === auth.user.id) {
      return res.status(400).json(createErrorResponse('Users cannot follow themselves'))
    }

    if ((auth.user.following || []).some(user => user.id === target.id)) {
      const state = await buildCommunityState(auth.user)
      return res.json(createSuccessResponse('Already following user', state))
    }

    const requestedAt = new Date().toISOString()
    let createdRequest = false
    const updatedSender = await mutateUser(auth.user.id, current => {
      createdRequest = !(current.sentFollowRequests || [])
        .some(request => request.id === target.id)
      return createdRequest
        ? {
            sentFollowRequests: [
              ...(current.sentFollowRequests || []),
              followRequestSnapshot(target, requestedAt),
            ],
          }
        : {}
    })
    if (!updatedSender) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }
    if (createdRequest) {
      try {
        const updatedTarget = await mutateUser(target.id, current => ({
          receivedFollowRequests: (current.receivedFollowRequests || [])
            .some(request => request.id === auth.user.id)
            ? current.receivedFollowRequests
            : [
                ...(current.receivedFollowRequests || []),
                followRequestSnapshot(auth.user, requestedAt),
              ],
        }))
        if (!updatedTarget) throw new Error('Target disappeared while sending request')
      } catch (error) {
        await mutateUser(auth.user.id, current => ({
          sentFollowRequests: (current.sentFollowRequests || [])
            .filter(request => request.id !== target.id),
        }))
        throw error
      }
    }
    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || auth.user)
    return res.json(createSuccessResponse(
      createdRequest ? 'Follow request sent successfully' : 'Follow request already pending',
      state
    ))
  } catch (error) {
    logger.error('Follow user error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function acceptFollowRequest(
    req: Request<object, object, FollowRequestActionRequest>,
    res: Response
  ) {
    try {
      const auth = await authenticate(req.body?.sessionId)
      if (isAuthError(auth)) return sendAuthError(res, auth)
      if (!validString(req.body?.userId)) {
        return res.status(400).json(createErrorResponse('A valid userId is required'))
      }

      const requesterId = req.body.userId.trim()
      const request = (auth.user.receivedFollowRequests || [])
        .find(item => item.id === requesterId)
      if (!request) {
        return res.status(404).json(createErrorResponse('Follow request not found'))
      }
      const requester = await findUserById(requesterId)
      if (!requester) {
        return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
      }

      let accepted = false
      const recipient = await mutateUser(auth.user.id, current => {
        accepted = (current.receivedFollowRequests || [])
          .some(item => item.id === requester.id)
        return accepted
          ? {
              followers: [
                ...(current.followers || []).filter(user => user.id !== requester.id),
                identitySnapshot(requester),
              ],
              receivedFollowRequests: (current.receivedFollowRequests || [])
                .filter(item => item.id !== requester.id),
            }
          : {}
      })
      if (!recipient || !accepted) {
        return res.status(404).json(createErrorResponse('Follow request not found'))
      }

      try {
        const updatedRequester = await mutateUser(requester.id, current => ({
          following: [
            ...(current.following || []).filter(user => user.id !== auth.user.id),
            publicSnapshot(recipient),
          ],
          sentFollowRequests: (current.sentFollowRequests || [])
            .filter(item => item.id !== auth.user.id),
        }))
        if (!updatedRequester) throw new Error('Requester disappeared during acceptance')
      } catch (error) {
        await mutateUser(auth.user.id, current => ({
          followers: (current.followers || []).filter(user => user.id !== requester.id),
          receivedFollowRequests: (current.receivedFollowRequests || [])
            .some(item => item.id === requester.id)
            ? current.receivedFollowRequests
            : [...(current.receivedFollowRequests || []), request],
        }))
        throw error
      }

      const current = await findUserById(auth.user.id)
      const state = await buildCommunityState(current || auth.user)
      return res.json(createSuccessResponse('Follow request accepted', state))
    } catch (error) {
      logger.error('Accept follow request error:', error)
      return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
    }
  }

export async function declineFollowRequest(
    req: Request<object, object, FollowRequestActionRequest>,
    res: Response
  ) {
    try {
      const auth = await authenticate(req.body?.sessionId)
      if (isAuthError(auth)) return sendAuthError(res, auth)
      if (!validString(req.body?.userId)) {
        return res.status(400).json(createErrorResponse('A valid userId is required'))
      }
      const requesterId = req.body.userId.trim()
      const requester = await findUserById(requesterId)
      if (requester) {
        await mutateUser(requester.id, current => ({
          sentFollowRequests: (current.sentFollowRequests || [])
            .filter(item => item.id !== auth.user.id),
        }))
      }
      await mutateUser(auth.user.id, current => ({
        receivedFollowRequests: (current.receivedFollowRequests || [])
          .filter(item => item.id !== requesterId),
      }))

      const current = await findUserById(auth.user.id)
      const state = await buildCommunityState(current || auth.user)
      return res.json(createSuccessResponse('Follow request declined', state))
    } catch (error) {
      logger.error('Decline follow request error:', error)
      return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
    }
  }

export async function cancelFollowRequest(
    req: Request<object, object, FollowRequestActionRequest>,
    res: Response
  ) {
    try {
      const auth = await authenticate(req.body?.sessionId)
      if (isAuthError(auth)) return sendAuthError(res, auth)
      if (!requireGuildAccess(auth.user, res)) return
      if (!validString(req.body?.userId)) {
        return res.status(400).json(createErrorResponse('A valid userId is required'))
      }
      const targetId = req.body.userId.trim()
      const target = await findUserById(targetId)
      if (target) {
        await mutateUser(target.id, current => ({
          receivedFollowRequests: (current.receivedFollowRequests || [])
            .filter(item => item.id !== auth.user.id),
        }))
      }
      await mutateUser(auth.user.id, current => ({
        sentFollowRequests: (current.sentFollowRequests || [])
          .filter(item => item.id !== targetId),
      }))

      const current = await findUserById(auth.user.id)
      const state = await buildCommunityState(current || auth.user)
      return res.json(createSuccessResponse('Follow request canceled', state))
    } catch (error) {
      logger.error('Cancel follow request error:', error)
      return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
    }
}

export async function unfollowUser(req: Request<object, object, UnfollowUserRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.body?.username) && !validString(req.body?.userId)) {
      return res.status(400).json(createErrorResponse('A valid username or userId is required'))
    }

    const username = req.body?.username
    const userId = req.body?.userId
    const target = validString(username)
      ? await findUserByUsername(username.trim())
      : await findUserById(userId!.trim())
    if (!target) return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    if (target.id === auth.user.id) {
      return res.status(400).json(createErrorResponse('Users cannot unfollow themselves'))
    }

    await mutateUser(auth.user.id, current => ({
      following: (current.following || []).filter(user => user.id !== target.id),
    }))
    await mutateUser(target.id, current => ({
      followers: (current.followers || []).filter(user => user.id !== auth.user.id),
    }))

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || auth.user)
    return res.json(createSuccessResponse('User unfollowed successfully', state))
  } catch (error) {
    logger.error('Unfollow user error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function createParty(req: Request<object, object, CreatePartyRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.body?.name, 40)) {
      return res.status(400).json(createErrorResponse('Party name must be between 2 and 40 characters'))
    }

    const name = req.body.name.trim()
    if (name.length < 2) {
      return res.status(400).json(createErrorResponse('Party name must be between 2 and 40 characters'))
    }
    if (auth.user.party) {
      return res.status(409).json(createErrorResponse('User already belongs to a party'))
    }

    const party: Party = {
      id: uuidv4(),
      name,
      ownerId: auth.user.id,
      members: [partyMemberSnapshot(auth.user)],
      createdAt: new Date().toISOString(),
    }
    await updateUser(auth.user.id, { party, partyInvites: [] })

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || { ...auth.user, party })
    return res.status(201).json(createSuccessResponse('Party created successfully', state))
  } catch (error) {
    logger.error('Create party error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function inviteToParty(req: Request<object, object, InviteToPartyRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.body?.username)) {
      return res.status(400).json(createErrorResponse('A valid username is required'))
    }
    if (!auth.user.party || auth.user.party.ownerId !== auth.user.id) {
      return res.status(403).json(createErrorResponse('Only the party owner can invite users'))
    }

    const target = await findUserByUsername(req.body.username.trim())
    if (!target) return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    if (target.id === auth.user.id) {
      return res.status(400).json(createErrorResponse('Party owners cannot invite themselves'))
    }
    if (calculateActualLevel(experienceFor(target)) < 10) {
      return res.status(409).json(createErrorResponse(
        'This player has not unlocked Guild features yet'
      ))
    }
    if (target.party) {
      return res.status(409).json(createErrorResponse('Target user already belongs to a party'))
    }

    const party = await synchronizeParty(auth.user.party)
    const existingInvites = await refreshInvites(target)
    if (existingInvites.some(invite => invite.partyId === party.id)) {
      return res.status(409).json(createErrorResponse('User has already been invited to this party'))
    }

    const invite: PartyInvite = {
      id: uuidv4(),
      partyId: party.id,
      partyName: party.name,
      invitedById: auth.user.id,
      invitedByUsername: auth.user.username,
      createdAt: new Date().toISOString(),
    }
    await updateUser(target.id, { partyInvites: [...existingInvites, invite] })

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || auth.user)
    return res.json(createSuccessResponse('Party invitation sent successfully', state))
  } catch (error) {
    logger.error('Invite to party error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function acceptPartyInvite(req: Request<object, object, AcceptPartyInviteRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!validString(req.body?.partyId) && !validString(req.body?.inviteId)) {
      return res.status(400).json(createErrorResponse('A valid partyId or inviteId is required'))
    }
    if (auth.user.party) {
      return res.status(409).json(createErrorResponse('User already belongs to a party'))
    }

    const inviteId = req.body?.inviteId
    const requestedPartyId = req.body?.partyId
    const invite = validString(inviteId)
      ? (auth.user.partyInvites || []).find(item => item.id === inviteId.trim())
      : (auth.user.partyInvites || []).find(item => item.partyId === requestedPartyId!.trim())
    if (!invite) {
      return res.status(404).json(createErrorResponse('Party invitation not found'))
    }
    const partyId = invite.partyId

    const owner = await findUserById(invite.invitedById)
    if (!owner?.party || owner.party.id !== partyId || owner.party.ownerId !== owner.id) {
      await updateUser(auth.user.id, {
        partyInvites: (auth.user.partyInvites || []).filter(item => item.partyId !== partyId),
      })
      return res.status(409).json(createErrorResponse('Party invitation is no longer valid'))
    }
    if (owner.party.members.some(member => member.id === auth.user.id)) {
      return res.status(409).json(createErrorResponse('User is already a member of this party'))
    }

    const joinedParty = await synchronizeParty({
      ...owner.party,
      members: [...owner.party.members, partyMemberSnapshot(auth.user)],
    })
    await updateUser(auth.user.id, {
      party: joinedParty,
      partyInvites: [],
    })

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || { ...auth.user, party: joinedParty })
    return res.json(createSuccessResponse('Party invitation accepted successfully', state))
  } catch (error) {
    logger.error('Accept party invite error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function leaveParty(req: Request<object, object, CommunitySessionRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
    if (!requireGuildAccess(auth.user, res)) return
    if (!auth.user.party) {
      return res.status(409).json(createErrorResponse('User does not belong to a party'))
    }

    const owner = await findUserById(auth.user.party.ownerId)
    const canonical = owner?.party?.id === auth.user.party.id ? owner.party : auth.user.party

    if (canonical.ownerId === auth.user.id) {
      for (const member of canonical.members) {
        await updateUser(member.id, { party: undefined })
      }
      const current = await findUserById(auth.user.id)
      const state = await buildCommunityState(current || { ...auth.user, party: undefined })
      return res.json(createSuccessResponse('Party disbanded successfully', state))
    }

    await updateUser(auth.user.id, { party: undefined })
    await synchronizeParty({
      ...canonical,
      members: canonical.members.filter(member => member.id !== auth.user.id),
    })

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || { ...auth.user, party: undefined })
    return res.json(createSuccessResponse('Party left successfully', state))
  } catch (error) {
    logger.error('Leave party error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}
