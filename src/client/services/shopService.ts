/**
 * Shop Service
 * Handles all shop item-related API calls including CRUD operations
 */

import { apiClient, type ApiResponse } from './apiClient'
import type { ProductMetadata, ShopItem } from '../../shared/types'

export interface NewShopItemData {
  title: string
  description?: string
  price: number
  image?: string
  isConsumable?: boolean
  isKeyItem?: boolean
  allowMultiplePurchases?: boolean
  sourceUrl?: string
  referenceUrl?: string
}

class ShopService {
  async previewProduct(sessionId: string, url: string): Promise<ProductMetadata> {
    const response = await apiClient.post<ProductMetadata>('/product/preview', { sessionId, url })
    if (!response.success || !response.data) {
      throw new Error(response.message || response.error || 'Product preview failed')
    }
    return response.data
  }

  async refreshLinkedItem(
    sessionId: string,
    itemId: string
  ): Promise<ApiResponse<{ shopItems: ShopItem[] }>> {
    return apiClient.post<{ shopItems: ShopItem[] }>('/user/shop/refresh-price', { sessionId, itemId })
  }

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
    itemPrice: number,
    itemDetails?: {
      title: string
      description?: string
      image?: string
      isConsumable?: boolean
      isKeyItem?: boolean
      allowMultiplePurchases?: boolean
    }
  ): Promise<ApiResponse> {
    console.log('💰 ShopService: Buying shop item:', itemId, 'for', itemPrice, 'shards')

    try {
      const response = await apiClient.post('/user/shop/buy', {
        sessionId,
        itemId,
        itemPrice,
        itemDetails
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

  /**
   * Use an inventory item (consumable)
   */
  async useInventoryItem(
    sessionId: string,
    itemId: string
  ): Promise<ApiResponse> {
    console.log('🎯 ShopService: Using inventory item:', itemId)

    try {
      const response = await apiClient.post('/user/inventory/use', {
        sessionId,
        itemId
      })

      if (response.success) {
        console.log('✅ ShopService: Inventory item used successfully')
      }

      return response
    } catch (error: any) {
      console.error('❌ ShopService: Inventory item use failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const shopService = new ShopService()
