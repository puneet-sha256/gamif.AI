import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'
import { usePrompt } from '../contexts/PromptContext'

interface ShopItemProps {
  id?: string
  image: string
  title: string
  description: string
  price: number
  userShards?: number
  onBuy?: (quantity?: number) => void
  onDelete?: () => void
  className?: string
  isUserItem?: boolean // Whether this is a user-created item
  allowMultiplePurchases?: boolean // Whether multiple purchases are allowed
}

const ShopItem: React.FC<ShopItemProps> = ({
  image,
  title,
  description,
  price,
  userShards = 0,
  onBuy,
  onDelete,
  className = '',
  isUserItem = false,
  allowMultiplePurchases = false
}) => {
  const { showConfirm } = useConfirm()
  const { showPrompt } = usePrompt()
  const canAfford = userShards >= price
  
  const handleBuyClick = async () => {
    if (!canAfford) return
    
    // Show custom confirmation dialog before buying
    const confirmed = await showConfirm(
      `Are you sure you want to buy "${title}" for ${price} 💎 shards?\n\nYou currently have ${userShards} 💎 shards.`,
      'Buy',
      'Cancel'
    )
    
    if (confirmed && onBuy) {
      // If multiple purchases are allowed, ask for quantity
      if (allowMultiplePurchases) {
        const maxAffordable = Math.floor(userShards / price)
        
        // Use styled prompt to ask for quantity
        const quantityStr = await showPrompt(
          `How many "${title}" would you like to buy?\n\nPrice: ${price} 💎 each\nYou can afford up to ${maxAffordable} items.`,
          {
            defaultValue: '1',
            placeholder: 'Enter quantity',
            inputType: 'number',
            min: 1,
            max: maxAffordable,
            confirmText: 'Buy',
            cancelText: 'Cancel'
          }
        )
        
        if (quantityStr === null) {
          // User cancelled the prompt
          return
        }
        
        const parsedQuantity = parseInt(quantityStr, 10)
        
        if (isNaN(parsedQuantity) || parsedQuantity < 1) {
          await showConfirm(
            'Please enter a valid quantity (minimum 1)',
            'OK'
          )
          return
        }
        
        if (parsedQuantity > maxAffordable) {
          await showConfirm(
            `You can only afford ${maxAffordable} items with your current ${userShards} 💎 shards.`,
            'OK'
          )
          return
        }
        
        onBuy(parsedQuantity)
      } else {
        // Single purchase
        onBuy(1)
      }
    }
  }
  
  return (
    <div className={`shop-item ${className}`}>
      <div className="item-image">{image}</div>
      <div className="item-info">
        <h4>{title}</h4>
        <p>{description}</p>
        <div className="item-price">{price} 💎</div>
      </div>
      <div className="shop-item-actions">
        <button 
          className="buy-button" 
          disabled={!canAfford}
          onClick={handleBuyClick}
          title={canAfford ? `Buy ${title} for ${price} 💎` : `Not enough shards (need ${price} 💎)`}
        >
          Buy
        </button>
        {isUserItem && onDelete && (
          <button 
            className="delete-button" 
            onClick={onDelete}
            title="Delete item"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

export default ShopItem