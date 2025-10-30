/**
 * Base API Client
 * Provides centralized HTTP communication with error handling and logging
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Log the API base URL on initialization
console.log('🌐 ApiClient: Initialized with VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL)
console.log('🌐 ApiClient: Using API_BASE_URL =', API_BASE_URL)

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export class ApiError extends Error {
  statusCode?: number
  response?: any

  constructor(
    message: string,
    statusCode?: number,
    response?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.response = response
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    console.log('🌐 ApiClient: Initialized with base URL:', this.baseUrl)
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    console.log('📡 ApiClient: Making request:', {
      method: options.method || 'GET',
      url,
      hasBody: !!options.body
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      console.log('📡 ApiClient: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ ApiClient: Request failed:', {
          status: response.status,
          message: data.message || data.error
        })
        throw new ApiError(
          data.message || data.error || 'Request failed',
          response.status,
          data
        )
      }

      console.log('✅ ApiClient: Request successful:', {
        success: data.success,
        hasData: !!data.data
      })

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      console.error('❌ ApiClient: Network error:', error)
      throw new ApiError(
        'Network error. Please check if the server is running.',
        undefined,
        error
      )
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
