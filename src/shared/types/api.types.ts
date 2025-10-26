import type { User } from './user.types'

// API Request Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LogoutRequest {
  sessionId?: string;
}

export interface ExperienceUpdateRequest {
  sessionId: string;
  strengthDelta?: number;
  intelligenceDelta?: number;
  charismaDelta?: number;
}

export interface ShardsUpdateRequest {
  sessionId: string;
  shardsDelta: number; // Can be positive (add) or negative (subtract)
  reason?: string; // Optional reason for the change (e.g., "Task completion", "Shop purchase")
}

export interface UpdateProfileRequest {
  sessionId: string;
  profile: {
    name?: string;
    age?: number;
    monthlyBudget?: number;
    currency?: string;
  };
}

export interface UpdateGoalsRequest {
  sessionId: string;
  goals: string[];
}

export interface UpdateTaskRequest {
  sessionId: string;
  taskId: string;
  category: 'Strength' | 'Intelligence' | 'Charisma';
  updates: {
    title?: string;
    description?: string;
    xp?: number;
    shards?: number;
  };
}

export interface DeleteTaskRequest {
  sessionId: string;
  taskId: string;
  category: 'Strength' | 'Intelligence' | 'Charisma';
}

export interface AddTaskRequest {
  sessionId: string;
  title: string; // User-provided title for the task
  description: string;
  category: 'Strength' | 'Intelligence' | 'Charisma';
  xp: number;
  shards: number;
}

export interface AnalyzeDailyActivityRequest {
  sessionId: string;
  dailyActivity: string; // User's description of what they did today
  currentTasks?: {
    Strength?: Array<{ id: string; description: string; xp: number; shards: number }>;
    Intelligence?: Array<{ id: string; description: string; xp: number; shards: number }>;
    Charisma?: Array<{ id: string; description: string; xp: number; shards: number }>;
  };
}

// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  user?: T;
  sessionId?: string;
  changes?: any;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Authentication response specifically
export interface AuthResponse {
  success: boolean
  message: string
  user?: Omit<User, 'passwordHash'>
  sessionId?: string
}

// Generic success/error response
export interface BaseResponse {
  success: boolean
  message: string
}

// Health Check Response
export interface HealthResponse {
  success: true;
  message: string;
  timestamp: string;
}

// Experience Update Response
export interface ExperienceUpdateResponse extends ApiSuccessResponse {
  changes: {
    strengthChange: number;
    intelligenceChange: number;
    charismaChange: number;
    totalExperienceChange: number;
  };
}

// Shards Update Response
export interface ShardsUpdateResponse extends ApiSuccessResponse {
  changes: {
    shardsChange: number;
    newShardsBalance: number;
    reason?: string;
  };
}

// Daily Activity Analysis Response
export interface AnalyzeDailyActivityResponse extends ApiSuccessResponse {
  data: {
    aiResponse: string; // The raw AI response for logging/debugging
    processingTime?: number;
  };
}