/**
 * Shop Service
 * Handles all shop item-related API calls including CRUD operations
 */

import { apiClient, type ApiResponse } from './apiClient'

export interface NewShopItemData {
  title: string
  description?: string
  price: number
  image?: string
}

class ShopService {
  /**
   * Add a new shop item
   */
  async addShopItem(
    sessionId: string,
    item: NewShopItemData
  ): Promise<ApiResponse> {
    console.log('➕ ShopService: Adding new shop item:', item.title)
    console.log('💰 ShopService: Price:', item.price)

    try {
      const response = await apiClient.post('/user/shop/add', {
        sessionId,
        ...item
      })

      if (response.success) {
        console.log('✅ ShopService: Shop item added successfully')
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Shop item addition failed:', error)
      throw error
    }
  }

  /**
   * Delete a shop item
   */
  async deleteShopItem(
    sessionId: string,
    itemId: string
  ): Promise<ApiResponse> {
    console.log('🗑️ ShopService: Deleting shop item:', itemId)

    try {
      const response = await apiClient.delete('/user/shop/delete', {
        sessionId,
        itemId
      })

      if (response.success) {
        console.log('✅ ShopService: Shop item deleted successfully')
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Shop item deletion failed:', error)
      throw error
    }
  }

  /**
   * Get all shop items for a user
   */
  async getUserShopItems(sessionId: string): Promise<ApiResponse> {
    console.log('🛒 ShopService: Fetching shop items for session:', sessionId.substring(0, 8) + '...')

    try {
      const response = await apiClient.get(`/user/shop/${sessionId}`)

      if (response.success) {
        console.log('✅ ShopService: Shop items fetched successfully')
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Shop items fetch failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const shopService = new ShopService()
