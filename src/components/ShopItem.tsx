import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'

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
        let quantity = 1
        
        // Use a simple prompt to ask for quantity
        const quantityStr = prompt(
          `How many "${title}" would you like to buy?\n\n` +
          `Price: ${price} 💎 each\n` +
          `You can afford up to ${maxAffordable} items.\n\n` +
          `Enter quantity:`,
          '1'
        )
        
        if (quantityStr === null) {
          // User cancelled the prompt
          return
        }
        
        const parsedQuantity = parseInt(quantityStr, 10)
        
        if (isNaN(parsedQuantity) || parsedQuantity < 1) {
          alert('Please enter a valid quantity (minimum 1)')
          return
        }
        
        if (parsedQuantity > maxAffordable) {
          alert(`You can only afford ${maxAffordable} items with your current ${userShards} 💎 shards.`)
          return
        }
        
        quantity = parsedQuantity
        onBuy(quantity)
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