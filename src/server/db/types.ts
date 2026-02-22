import type {
  ProfileData,
  GoalsData,
  UserStats,
  GeneratedTasks,
  ShopItem,
  InventoryItem,
  UnclaimedRewards,
  ActivityHistory,
  TaskHistory
} from '../../shared/types'

// ─── Cosmos sub-document types ───────────────────────────────────────────────
// Each user partition (keyed by userId) contains up to 5 sub-documents.
// Only the profile doc is required; others are lazily created on first write.

export interface ProfileSubDoc {
  id: 'profile'
  type: 'profile'
  userId: string
  username: string
  email: string
  passwordHash: string
  createdAt: string
  lastLogin?: string
  profileData?: ProfileData
  goalsData?: GoalsData
  stats?: UserStats
}

export interface TasksSubDoc {
  id: 'tasks'
  type: 'tasks'
  userId: string
  generatedTasks?: GeneratedTasks
}

export interface ShopSubDoc {
  id: 'shop'
  type: 'shop'
  userId: string
  shopItems?: ShopItem[]
  inventory?: InventoryItem[]
}

export interface HistorySubDoc {
  id: 'history'
  type: 'history'
  userId: string
  activityHistory?: ActivityHistory
  taskHistory?: TaskHistory
}

export interface RewardsSubDoc {
  id: 'rewards'
  type: 'rewards'
  userId: string
  unclaimedRewards?: UnclaimedRewards
}

export type SubDoc = ProfileSubDoc | TasksSubDoc | ShopSubDoc | HistorySubDoc | RewardsSubDoc
export type SubDocType = 'profile' | 'tasks' | 'shop' | 'history' | 'rewards'

// ─── Session document ────────────────────────────────────────────────────────

export interface SessionDoc {
  id: string        // same as sessionId
  sessionId: string
  userId: string
  createdAt: string
  lastAccess: string
  ttl: number       // auto-expiry in seconds (86400 = 24h)
}

// ─── Field-to-subdoc dispatch mapping ────────────────────────────────────────
// Maps each top-level User field to the sub-doc it lives in.

export const FIELD_TO_SUBDOC: Record<string, SubDocType> = {
  // profile sub-doc
  username: 'profile',
  email: 'profile',
  passwordHash: 'profile',
  createdAt: 'profile',
  lastLogin: 'profile',
  profileData: 'profile',
  goalsData: 'profile',
  stats: 'profile',

  // tasks sub-doc
  generatedTasks: 'tasks',

  // shop sub-doc
  shopItems: 'shop',
  inventory: 'shop',

  // history sub-doc
  activityHistory: 'history',
  taskHistory: 'history',

  // rewards sub-doc
  unclaimedRewards: 'rewards',
}
