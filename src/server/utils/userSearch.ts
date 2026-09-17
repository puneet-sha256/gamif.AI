import type { User } from '../../shared/types'

function relevance(user: User, query: string): number {
  const username = user.username.toLowerCase()
  const name = (user.profileData?.name || '').toLowerCase()
  if (username === query) return 0
  if (name === query) return 1
  if (username.startsWith(query)) return 2
  if (name.startsWith(query)) return 3
  if (username.includes(query)) return 4
  if (name.includes(query)) return 5
  return 6
}

export function rankUserSearchResults(users: User[], query: string, limit: number): User[] {
  const normalized = query.trim().toLowerCase()
  return [...users]
    .sort((left, right) =>
      relevance(left, normalized) - relevance(right, normalized)
      || left.username.localeCompare(right.username)
    )
    .slice(0, limit)
}
