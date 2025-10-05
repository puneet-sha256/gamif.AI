import { v4 as uuidv4 } from 'uuid'

export function hashPassword(password: string): string {
  // Simple hash function for demo purposes
  // In production, use bcrypt or similar
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}

export function generateSessionId(): string {
  return uuidv4()
}

export function generateUserId(): string {
  return uuidv4()
}

export function verifyPassword(inputPassword: string, hashedPassword: string): boolean {
  return hashPassword(inputPassword) === hashedPassword
}