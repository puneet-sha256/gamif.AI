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

// Legacy response interfaces (for backward compatibility)
export interface LegacyApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  user?: User
  sessionId?: string
}

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