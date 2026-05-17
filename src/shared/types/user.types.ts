import type { CatalogData } from './catalog.types'

// Core user-related interfaces
export interface ProfileData {
  name: string
  age: number
}

export interface GoalsData {
  longTermGoals: string
}

export interface UserStats {
  experience: number
  shards: number
  strength: number
  intelligence: number
  charisma: number
}

// Task structure from Azure AI and user-created tasks
export interface GeneratedTask {
  id: string // Unique identifier for the task
  title?: string // Optional: present for user-created tasks, absent for AI tasks
  description: string
  expected_duration_minutes?: number // Estimated time to complete the task (used for effort_ratio calculation)
  xp: number
  shards: number
  // v2 catalog fields (Milestone 1C). Optional for v1 tasks already in Cosmos.
  // When present, frontend computes display reward from user.catalog rather than from xp/shards above.
  tag?: string
  modifier?: string
  signature?: string // tag|category|modifier
}

export interface GeneratedTasks {
  Strength?: GeneratedTask[]
  Intelligence?: GeneratedTask[]
  Charisma?: GeneratedTask[]
  lastUpdated?: string
}

// Shop item structure for user-created shop items
export interface ShopItem {
  id: string // Unique identifier for the shop item
  title: string // Name of the item
  description?: string // Optional description
  price: number // Price in shards
  image?: string // Optional emoji or image
  createdAt: string // When the item was added
  isConsumable?: boolean // Whether the item is consumable (can be used once)
  isKeyItem?: boolean // Whether the item is a key item (cannot be consumed)
  allowMultiplePurchases?: boolean // Whether the item can be purchased multiple times (remains in shop after purchase)
}

// Inventory item structure for purchased items
export interface InventoryItem {
  id: string // Unique identifier for the inventory item (same as shop item id)
  title: string // Name of the item
  description?: string // Optional description
  price: number // Original price in shards
  image?: string // Optional emoji or image
  count: number // Number of this item owned
  purchasedAt: string // When the item was first purchased
  isConsumable?: boolean // Whether the item is consumable (can be used once)
  isKeyItem?: boolean // Whether the item is a key item (cannot be consumed)
}

// v2 reward tier classification (Milestone 1C). 5 discrete tiers, fixed multipliers.
export type RewardTier =
  | 'goal-exact'        // matches a planned task today (1.20x)
  | 'goal-similar'      // same tag+category as a planned task, different modifier (1.10x)
  | 'goal-aligned'      // category appears in user's goals (1.00x)
  | 'category-aligned'  // recognised activity category but not goal-aligned (0.80x)
  | 'unrelated'         // no category fit, no reward (0)

// v2 user feedback vote on a claimed reward (Milestone 1D).
export type CatalogVote = 'up' | 'over' | 'under'

// Per-activity rate breakdown for UI transparency (v2 only).
export interface RewardRateBreakdown {
  rate: number    // xp_per_min, xp_per_unit, or xp_flat
  value: number   // minutes, count, or 1 (for event)
  unit: 'time' | 'count' | 'event'
}

// Unclaimed reward from daily activity analysis
export interface UnclaimedReward {
  activityName: string
  matchType: string
  category: 'Strength' | 'Intelligence' | 'Charisma'
  matchedTask?: string
  goalLink?: string
  effortRatio: number
  xpEarned: number
  shardsEarned: number
  calculationNotes: string
  timestamp: string // When the reward was earned
  activityDate: string // Date of the activity (YYYY-MM-DD)
  // v2 fields (Milestone 1C). Optional for v1 entries already in Cosmos.
  signature?: string             // tag|category|modifier — used by feedback to find the catalog row
  tier?: RewardTier              // discrete tier from classifier
  tierMultiplier?: number        // 1.20 | 1.10 | 1.0 | 0.80 | 0
  systemVersion?: 'v2'           // omit on v1 entries
  rateBreakdown?: RewardRateBreakdown
}

export interface UnclaimedRewards {
  activities: UnclaimedReward[]
  totalXP: number
  totalShards: number
  categoryBreakdown: {
    Strength: { xp: number; shards: number }
    Intelligence: { xp: number; shards: number }
    Charisma: { xp: number; shards: number }
  }
  lastUpdated: string
}

// Daily activity history for heatmap
export interface DailyActivity {
  date: string // ISO date string (YYYY-MM-DD)
  strength: number // XP earned in Strength
  intelligence: number // XP earned in Intelligence
  charisma: number // XP earned in Charisma
  total: number // Total XP earned
}

export interface StreakCache {
  asOfDate: string // ISO date string (YYYY-MM-DD) - last date streaks were calculated for
  strengthStreak: number // Streak count as of asOfDate
  intelligenceStreak: number // Streak count as of asOfDate
  charismaStreak: number // Streak count as of asOfDate
}

export interface ActivityHistory {
  dailyActivities: DailyActivity[]
  lastUpdated: string
  streakCache?: StreakCache // Memoized streak data for O(1) incremental calculation
}

// Completed task details for a specific date
export interface CompletedTask {
  activityName: string
  matchType: string
  category: 'Strength' | 'Intelligence' | 'Charisma'
  matchedTask?: string
  goalLink?: string
  effortRatio: number
  xpEarned: number
  shardsEarned: number
  calculationNotes: string
  timestamp: string
  // v2 fields (Milestone 1C). Optional for v1 entries already in Cosmos.
  signature?: string
  tier?: RewardTier
  tierMultiplier?: number
  systemVersion?: 'v2'
  rateBreakdown?: RewardRateBreakdown
}

// Task history grouped by date
export interface DailyTaskHistory {
  date: string // ISO date string (YYYY-MM-DD)
  tasks: CompletedTask[]
}

export interface TaskHistory {
  dailyTasks: DailyTaskHistory[]
  lastUpdated: string
}

export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: string
  lastLogin?: string
  profileData?: ProfileData
  goalsData?: GoalsData
  stats?: UserStats
  generatedTasks?: GeneratedTasks
  shopItems?: ShopItem[] // User's custom shop items (wishlist)
  inventory?: InventoryItem[] // User's purchased items
  unclaimedRewards?: UnclaimedRewards // Pending rewards from daily activities
  activityHistory?: ActivityHistory // Historical daily XP data for heatmap
  taskHistory?: TaskHistory // Detailed task history for each date
  catalog?: CatalogData // Per-user rewards calibration catalog (Milestone 1B+)
}

export interface UserRegistration {
  username: string
  email: string
  password: string
}

export interface UserLogin {
  email: string
  password: string
}