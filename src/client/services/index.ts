/**
 * Client Services Index
 * Central export point for all client-side services
 */

// Export API Client
export { apiClient, ApiError, type ApiResponse } from './apiClient'

// Export AI Service
export { aiService, type GenerateTasksRequest, type GenerateTasksResponse } from './aiService'

// Export Task Service
export { taskService, type TaskUpdateData, type NewTaskData } from './taskService'

// Export Shop Service
export { shopService, type NewShopItemData } from './shopService'

// Export User Database (Auth Service)
export { userDatabase } from './fileUserDatabase'
export type { User, UserRegistration, UserLogin, ProfileData, GoalsData } from './fileUserDatabase'
