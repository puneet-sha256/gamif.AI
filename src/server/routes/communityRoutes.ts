import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import type {
  CommunityState,
  CommunitySearchResult,
  CommunityUserSnapshot,
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
  return {
    id: user.id,
    username: user.username,
    name: user.profileData?.name || user.username,
    level: calculateActualLevel(experienceFor(user)),
    experience: experienceFor(user),
  }
}

function partyMemberSnapshot(user: User, joinedAt = new Date().toISOString()): PartyMemberSnapshot {
  const experience = experienceFor(user)
  return {
    ...publicSnapshot(user),
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

async function refreshedSnapshots(
  snapshots: CommunityUserSnapshot[] | undefined
): Promise<CommunityUserSnapshot[]> {
  const users = await Promise.all((snapshots || []).map(snapshot => findUserById(snapshot.id)))
  return users.filter((user): user is User => !!user).map(publicSnapshot)
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
  const [following, followers, partyInvites] = await Promise.all([
    refreshedSnapshots(user.following),
    refreshedSnapshots(user.followers),
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
    || JSON.stringify(partyInvites) !== JSON.stringify(user.partyInvites || [])
  ) {
    await updateUser(user.id, { following, followers, partyInvites })
  }

  return {
    user: publicSnapshot(user),
    following,
    followers,
    party,
    partyInvites,
  }
}

function sendAuthError(res: Response, result: { status: number; message: string }) {
  return res.status(result.status).json(createErrorResponse(result.message))
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
    if (!validString(req.query.q, 40) || req.query.q.trim().length < 2) {
      return res.status(400).json(createErrorResponse(
        'Search query must be between 2 and 40 characters'
      ))
    }

    const matches = await searchUsers(req.query.q.trim(), 16)
    const followingIds = new Set((auth.user.following || []).map(user => user.id))
    const followerIds = new Set((auth.user.followers || []).map(user => user.id))
    const results: CommunitySearchResult[] = matches
      .filter(user => user.id !== auth.user.id)
      .map(user => ({
        id: user.id,
        username: user.username,
        name: user.profileData?.name || user.username,
        level: calculateActualLevel(experienceFor(user)),
        isFollowing: followingIds.has(user.id),
        followsYou: followerIds.has(user.id),
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
    if (!validString(req.body?.username)) {
      return res.status(400).json(createErrorResponse('A valid username is required'))
    }

    const target = await findUserByUsername(req.body.username.trim())
    if (!target) return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    if (target.id === auth.user.id) {
      return res.status(400).json(createErrorResponse('Users cannot follow themselves'))
    }

    const alreadyFollowing = (auth.user.following || []).some(user => user.id === target.id)
    if (!alreadyFollowing) {
      await updateUser(auth.user.id, {
        following: [...(auth.user.following || []), publicSnapshot(target)],
      })
    }
    if (!(target.followers || []).some(user => user.id === auth.user.id)) {
      await updateUser(target.id, {
        followers: [...(target.followers || []), publicSnapshot(auth.user)],
      })
    }

    const current = await findUserById(auth.user.id)
    const state = await buildCommunityState(current || auth.user)
    return res.json(createSuccessResponse(
      alreadyFollowing ? 'Already following user' : 'User followed successfully',
      state
    ))
  } catch (error) {
    logger.error('Follow user error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

export async function unfollowUser(req: Request<object, object, UnfollowUserRequest>, res: Response) {
  try {
    const auth = await authenticate(req.body?.sessionId)
    if (isAuthError(auth)) return sendAuthError(res, auth)
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

    await updateUser(auth.user.id, {
      following: (auth.user.following || []).filter(user => user.id !== target.id),
    })
    await updateUser(target.id, {
      followers: (target.followers || []).filter(user => user.id !== auth.user.id),
    })

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
