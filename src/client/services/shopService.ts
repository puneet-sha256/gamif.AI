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

    try {
      const response = await apiClient.post('/user/shop/add', {
        sessionId,
        ...item
      })

      if (response.success) {
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

    try {
      const response = await apiClient.delete('/user/shop/delete', {
        sessionId,
        itemId
      })

      if (response.success) {
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

    try {
      const response = await apiClient.get(`/user/shop/${sessionId}`)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Shop items fetch failed:', error)
      throw error
    }
  }

  /**
   * Buy a shop item
   */
  async buyShopItem(
    sessionId: string,
    itemId: string,
    itemPrice: number
  ): Promise<ApiResponse> {
    console.log('💰 ShopService: Buying shop item:', itemId, 'for', itemPrice, 'shards')

    try {
      const response = await apiClient.post('/user/shop/buy', {
        sessionId,
        itemId,
        itemPrice
      })

      if (response.success) {
        console.log('✅ ShopService: Shop item purchased successfully')
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Shop item purchase failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const shopService = new ShopService()
